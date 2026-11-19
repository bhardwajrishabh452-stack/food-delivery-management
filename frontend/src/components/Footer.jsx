import React from "react";
import { Link } from "react-router-dom";
import {
  Apple,
  Camera,
  CirclePlay,
  Play,
  UtensilsCrossed,
} from "lucide-react";
import "./Footer.css";

const FooterLink = ({ to, children }) => (
  to.includes("#") ? (
    <a className="fds-footer-link" href={to}>{children}</a>
  ) : (
    <Link className="fds-footer-link" to={to}>{children}</Link>
  )
);

const unavailableLinks = ["Careers", "Contact Us"];
const informationalLinks = ["Privacy Policy", "Security", "Terms of Service", "Help Center"];

export const Footer = () => (
  <footer className="fds-footer">
    <div className="fds-footer-container">
      <div className="fds-footer-top">
        <a className="fds-footer-brand" href="/" aria-label="Food Delivery System home">
          <span className="fds-footer-brand-icon"><UtensilsCrossed size={24} aria-hidden="true" /></span>
          <span className="fds-footer-brand-name">FDS</span>
        </a>

        <div className="fds-footer-selects">
          <label className="fds-footer-select-wrap">
            <span className="sr-only">Country</span>
            <select defaultValue="India" aria-label="Country">
              <option>India</option>
              <option>United States</option>
              <option>United Kingdom</option>
            </select>
          </label>
          <label className="fds-footer-select-wrap">
            <span className="sr-only">Language</span>
            <select defaultValue="English" aria-label="Language">
              <option>English</option>
              <option>Hindi</option>
            </select>
          </label>
        </div>
      </div>

      <nav className="fds-footer-columns" aria-label="Footer">
        <section className="fds-footer-column" aria-labelledby="footer-about">
          <h2 id="footer-about">About FDS</h2>
          <FooterLink to="#about-fds">Who We Are</FooterLink>
          <FooterLink to="#about-fds">Our Story</FooterLink>
          {unavailableLinks.map((label) => (
            <span className="fds-footer-link fds-footer-link-unavailable" key={label} title="Coming soon">
              {label}
            </span>
          ))}
        </section>

        <section className="fds-footer-column" aria-labelledby="footer-explore">
          <h2 id="footer-explore">Explore</h2>
          <FooterLink to="/#restaurants">Restaurants</FooterLink>
          <FooterLink to="/#categories">Food Categories</FooterLink>
          <FooterLink to="/checkout">Offers &amp; Coupons</FooterLink>
          <FooterLink to="/#restaurants">Popular Locations</FooterLink>
        </section>

        <section className="fds-footer-column" aria-labelledby="footer-restaurants">
          <h2 id="footer-restaurants">For Restaurants</h2>
          <FooterLink to="/register">Partner With Us</FooterLink>
          <FooterLink to="/restaurant-panel">Restaurant Dashboard</FooterLink>
          <FooterLink to="/register">Delivery Partners</FooterLink>
        </section>

        <section className="fds-footer-column" aria-labelledby="footer-learn">
          <h2 id="footer-learn">Learn More</h2>
          {informationalLinks.map((label) => (
            <span className="fds-footer-link fds-footer-link-unavailable" key={label} title="Coming soon">
              {label}
            </span>
          ))}
        </section>

        <section className="fds-footer-column fds-footer-social" aria-labelledby="footer-social">
          <h2 id="footer-social">Social Links</h2>
          <div className="fds-footer-social-icons" aria-label="FDS social profiles coming soon">
            <span title="LinkedIn profile coming soon" aria-label="LinkedIn">in</span>
            <span title="Instagram profile coming soon"><Camera size={18} aria-hidden="true" /><span className="sr-only">Instagram</span></span>
            <span className="fds-footer-x-icon" title="X profile coming soon" aria-label="X">X</span>
            <span title="YouTube channel coming soon"><CirclePlay size={18} aria-hidden="true" /><span className="sr-only">YouTube</span></span>
            <span title="Facebook page coming soon" aria-label="Facebook">f</span>
          </div>
          <div className="fds-footer-app-badges" aria-label="Mobile apps coming soon">
            <span className="fds-footer-app-badge" title="App Store app coming soon">
              <Apple size={19} aria-hidden="true" />
              <span><small>Coming soon on the</small><strong>App Store</strong></span>
            </span>
            <span className="fds-footer-app-badge" title="Google Play app coming soon">
              <Play size={18} aria-hidden="true" />
              <span><small>Coming soon on</small><strong>Google Play</strong></span>
            </span>
          </div>
        </section>
      </nav>

      <div className="fds-footer-bottom" id="about-fds">
        <p>
          Food Delivery System (FDS) – Ordering, Geo-Tracking, Dispatch and Settlements.
          Prototype only: No real payments or bank settlements.
        </p>
        <p className="fds-footer-copyright">© {new Date().getFullYear()} Food Delivery System (FDS). All rights reserved.</p>
      </div>
    </div>
  </footer>
);
