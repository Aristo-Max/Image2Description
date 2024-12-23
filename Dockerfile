# Use the official Node.js image as a base
FROM node:22

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Install Python and any required packages
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Create a virtual environment for Python
RUN python3 -m venv /usr/src/app/venv

# Activate the virtual environment and install Python dependencies
RUN /usr/src/app/venv/bin/pip install --upgrade pip && \
    /usr/src/app/venv/bin/pip install -r requirements.txt

# Expose the port your app runs on
EXPOSE 3000

# Start the Node.js server
CMD ["node", "server.js"]