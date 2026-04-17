// components/layout/Footer.tsx

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FaTwitter, FaLinkedin, FaEnvelope,
  FaShieldAlt, FaClock, FaCheckCircle, FaBolt,
  FaArrowRight, FaTelegram, FaDiscord, FaGithub,
} from "react-icons/fa";
import { Zap } from "lucide-react";
import toast from "react-hot-toast";

const FOOTER_SECTIONS = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "/#features" },
      { name: "Agents", href: "/#agents" },
      { name: "Dashboard", href: "/dashboard" },
      { name: "Pricing", href: "/pricing" },
      { name: "Documentation", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/careers" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Security", href: "/security" },
      { name: "Status", href: "/status" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Help Center", href: "/help" },
      { name: "Community", href: "/community" },
      { name: "Contact Support", href: "/support" },
      { name: "Report Issue", href: "/report" },
    ],
  },
];

const SOCIAL_LINKS = [
  { name: "Twitter", icon: FaTwitter, href: "https://twitter.com/finpath" },
  { name: "LinkedIn", icon: FaLinkedin, href: "https://linkedin.com/company/finpath" },
  { name: "Telegram", icon: FaTelegram, href: "https://t.me/finpath" },
  { name: "Discord", icon: FaDiscord, href: "https://discord.gg/finpath" },
  { name: "GitHub", icon: FaGithub, href: "https://github.com/finpath" },
  { name: "Email", icon: FaEnvelope, href: "mailto:hello@finpath.io" },
];

const BADGES = [
  { label: "SOC 2 Type II", icon: FaShieldAlt },
  { label: "99.9% Uptime", icon: FaClock },
  { label: "AI Verified", icon: FaCheckCircle },
  { label: "Instant Insights", icon: FaBolt },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const year = new Date().getFullYear();

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setSubscribing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Subscribed successfully!");
    setEmail("");
    setSubscribing(false);
  };

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      {/* Newsletter Section */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={20} className="text-brand" />
                <h3 className="text-xl md:text-2xl font-bold text-text-base">
                  Stay ahead of your finances
                </h3>
              </div>
              <p className="text-sm text-text-muted">
                Get weekly AI-powered insights, spending tips, and investment opportunities.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm bg-surface-raised border border-border rounded-xl text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="px-6 py-2.5 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl text-sm transition-all inline-flex items-center gap-2 justify-center disabled:opacity-50"
              >
                {subscribing ? "Subscribing..." : "Subscribe"}
                <FaArrowRight className="h-3 w-3" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-brand transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Security Badges */}
        <div className="flex flex-wrap items-center justify-center md:justify-between gap-4 bg-surface-raised border border-border rounded-xl px-6 py-4 mb-10">
          <div className="flex items-center gap-2">
            <FaShieldAlt className="h-4 w-4 text-brand" />
            <span className="text-sm font-medium text-text-secondary">
              Enterprise-grade security
            </span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {BADGES.map((badge) => {
              const Icon = badge.icon;
              return (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-surface border border-border text-text-muted"
                >
                  <Icon className="h-3 w-3 text-brand" />
                  {badge.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand-muted flex items-center justify-center">
              <Zap size={16} className="text-brand fill-brand" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-text-base">
              Fin<span className="text-brand">Path</span>
            </span>
          </Link>

          {/* Copyright */}
          <p className="text-xs text-text-faint text-center">
            © {year} FinPath. All rights reserved. Not SEBI registered. For educational purposes only.
          </p>

          {/* Social Links */}
          <div className="flex gap-4">
            {SOCIAL_LINKS.map((social) => {
              const Icon = social.icon;
              return (
                <Link
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="text-text-muted hover:text-brand transition-all duration-200 hover:scale-110"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}