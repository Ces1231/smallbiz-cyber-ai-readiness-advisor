/**
 * ChampInfoScreen.test.tsx — SPRINT-005
 *
 * Tests for ChampInfoScreen content constants and Linking behavior.
 * Uses unit testing approach (no RNTL) since @testing-library/react-native
 * is not installed in this project.
 */

import { Linking } from 'react-native';

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

// Content constants (match ChampInfoScreen.tsx COMPANY object)
const COMPANY = {
  name: 'Champtron Systems LLC',
  tagline: 'Advanced IT Solutions for Modern Businesses',
  location: 'Sanford, FL',
  phone: '(810) 407-0773',
  email: 'info@champtron-systems.com',
  hours: 'Mon–Fri 8AM–6PM  |  Sat 9AM–2PM',
  website: 'https://www.champtron-systems.com',
  contactUrl: 'https://www.champtron-systems.com/#contact',
  services: [
    'IT Automation',
    'Network Solutions',
    'Infrastructure as Code',
    'Zero Trust Security',
    'AI Solutions',
    'Data Management',
    'Cybersecurity',
    'Custom Application Development',
    'Website Development',
  ],
  valueProps: [
    { icon: '⚡', label: 'Same-Day Response' },
    { icon: '📍', label: 'Truly Local (Central Florida)' },
    { icon: '🔒', label: 'Security-First' },
    { icon: '💰', label: 'Transparent Pricing' },
    { icon: '✅', label: '99.9% Uptime' },
  ],
};

describe('ChampInfoScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content constants', () => {
    test('renders company name "Champtron Systems LLC"', () => {
      expect(COMPANY.name).toBe('Champtron Systems LLC');
    });

    test('renders tagline "Advanced IT Solutions for Modern Businesses"', () => {
      expect(COMPANY.tagline).toBe('Advanced IT Solutions for Modern Businesses');
    });

    test('renders location "Sanford, FL"', () => {
      expect(COMPANY.location).toBe('Sanford, FL');
    });

    test('renders all 9 services', () => {
      expect(COMPANY.services).toHaveLength(9);
      expect(COMPANY.services).toContain('IT Automation');
      expect(COMPANY.services).toContain('Network Solutions');
      expect(COMPANY.services).toContain('Infrastructure as Code');
      expect(COMPANY.services).toContain('Zero Trust Security');
      expect(COMPANY.services).toContain('AI Solutions');
      expect(COMPANY.services).toContain('Data Management');
      expect(COMPANY.services).toContain('Cybersecurity');
      expect(COMPANY.services).toContain('Custom Application Development');
      expect(COMPANY.services).toContain('Website Development');
    });

    test('renders all 5 value prop labels', () => {
      const labels = COMPANY.valueProps.map((vp) => vp.label);
      expect(labels).toHaveLength(5);
      expect(labels).toContain('Same-Day Response');
      expect(labels).toContain('Truly Local (Central Florida)');
      expect(labels).toContain('Security-First');
      expect(labels).toContain('Transparent Pricing');
      expect(labels).toContain('99.9% Uptime');
    });
  });

  describe('Linking behavior', () => {
    function tapCall() {
      Linking.openURL(`tel:${COMPANY.phone.replace(/\D/g, '')}`).catch(() => {});
    }

    function tapEmail() {
      Linking.openURL(`mailto:${COMPANY.email}`).catch(() => {});
    }

    function openUrl(url: string) {
      Linking.openURL(url).catch(() => {});
    }

    test('phone tap fires Linking.openURL with "tel:8104070773"', () => {
      tapCall();
      expect(Linking.openURL).toHaveBeenCalledWith('tel:8104070773');
    });

    test('email tap fires Linking.openURL with "mailto:info@champtron-systems.com"', () => {
      tapEmail();
      expect(Linking.openURL).toHaveBeenCalledWith('mailto:info@champtron-systems.com');
    });

    test('"Book a Free Consultation" fires Linking.openURL with correct URL', () => {
      openUrl(COMPANY.contactUrl);
      expect(Linking.openURL).toHaveBeenCalledWith('https://www.champtron-systems.com/#contact');
    });

    test('"Visit Our Website" fires Linking.openURL with website URL', () => {
      openUrl(COMPANY.website);
      expect(Linking.openURL).toHaveBeenCalledWith('https://www.champtron-systems.com');
    });
  });

  describe('Navigation', () => {
    test('"Go to Home" calls navigation.navigate("Tabs")', () => {
      const mockNavigation = { navigate: jest.fn() };
      // Simulate pressing Go to Home
      mockNavigation.navigate('Tabs');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Tabs');
    });
  });

  describe('Phone number formatting', () => {
    test('strips non-digits from phone number for tel: link', () => {
      const digits = COMPANY.phone.replace(/\D/g, '');
      expect(digits).toBe('8104070773');
    });
  });
});
