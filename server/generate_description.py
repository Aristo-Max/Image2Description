import sys
import re
import json
import os
import warnings
import google.generativeai as genai
import PIL.Image as pl
from absl import logging

# Suppress Warnings
warnings.filterwarnings("ignore")
os.environ["GRPC_VERBOSITY"] = "NONE"
os.environ["GRPC_TRACE"] = ""
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

# Configure Logging
logging.set_verbosity(logging.FATAL)
logging.use_absl_handler()
genai.configure(api_key="AIzaSyCHEsnAZ8MR30HJccqRN3ibW7KU43fgj34")

def extract_fields(text, image_path):
    trimmed_image_path = os.path.relpath(image_path, start=os.path.dirname(image_path)).replace("\\", "/")
    cleaned_text = re.sub(r'- \*\*(.*?)\*\*: (.*?)(?=\n- \*\*|\Z)', r'\1: \2', text, flags=re.DOTALL)
    key_value_dict = {}
    key_value_dict["Image"] = f'../../upload/{trimmed_image_path.split(os.sep)[-1]}'
    for line in cleaned_text.splitlines():
        if ':' in line:
            key, value = line.split(":", 1)
            key = re.sub(r'- \*\*', '', key).strip()
            value = value.replace('**', '').strip()
            key_value_dict[key] = value
    return key_value_dict

def generate_description(image_path):
    model = genai.GenerativeModel("gemini-1.5-flash")
    organ = pl.open(image_path)
    context = f"""
    This is an image of a product to be listed on an e-commerce website.
    Describe the product in an SEO-optimized manner to help it rank better.
    Include only the following fields in the output:
    - Title
    - Product Description
    - Meta Description
    - Key Features
    - Use Cases
    - Material
    - Style
    - Keywords
    - Call to Action
    - Sizes (if available)

    Do not include any other lines or sections in the description.
    """
    response = model.generate_content([context, organ])
    result = extract_fields(response.text, image_path)
    return result

if __name__ == "__main__":
    image_path = sys.argv[1]
    description = generate_description(image_path)
    print(json.dumps(description))