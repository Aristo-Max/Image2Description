import React from "react";
import { Container } from "@mui/material";

const Footer = () => {
    return (
        <footer style={{ marginTop: 'auto', padding: '9px', backgroundColor: '#F5F5F5', color: '#000000', textAlign: 'center' }}>
            <Container>
                <p>© 2025 <a href="https://www.aristomax.com/" style={{ color: '#000000', textDecoration: 'None', fontWeight: 'bold' }}>Aristomax Technologies Pvt. Ltd.</a>, All Right Reserved.</p>
            </Container>
        </footer >
    );
};

export default Footer;