"""Content and deployment checks for the static portfolio. Run: python3 -m unittest discover -s tests."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PortfolioParser(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.elements = []
        self.text = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def handle_data(self, data):
        self.text.append(data)


class PortfolioTests(unittest.TestCase):
    maxDiff = 500

    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / 'index.html').read_text()
        parsed = PortfolioParser(cls.source)
        cls.elements = parsed.elements
        cls.content = ' '.join(' '.join(parsed.text).split())

    def test_identity_uses_albert_as_the_name(self):
        self.assertNotIn('Albert Choe', self.source)
        self.assertIn('<title>Albert — Software Engineer</title>', self.source)

    def test_current_profile_replaces_student_information(self):
        self.assertIn('graduate', self.source)
        self.assertIn('3.65', self.source)
        self.assertNotIn('121 credits', self.source)
        self.assertNotIn('Engineering student', self.source)

    def test_oxy_and_verifiable_certification_are_present(self):
        self.assertIn('Oxy Reflexy', self.source)
        self.assertIn('AWS Certified AI Practitioner', self.content)
        self.assertTrue(any(
            a.get('href') == 'https://www.credly.com/badges/40645bbd-b5d7-4b5d-8419-11febff28b92/public'
            for tag, a in self.elements if tag == 'a'
        ))

    def test_projects_use_text_and_home_omits_status(self):
        projects = self.source.split('id="projects"', 1)[1].split('id="experience"', 1)[0]
        self.assertNotIn('<img', projects)
        self.assertNotIn('system-art', projects)
        self.assertNotIn('hand-art', projects)
        home = self.source.split('id="home"', 1)[1].split('id="projects"', 1)[0]
        self.assertNotIn('Currently at', home)
        self.assertNotIn('hero-stack', home)

    def test_decorative_monogram_and_certificate_symbol_are_removed(self):
        self.assertNotIn('about-monogram', self.source)
        self.assertNotIn('credential-symbol', self.source)

    def test_profile_uses_the_graduation_photo(self):
        portraits = [a for tag, a in self.elements if tag == 'img']
        self.assertTrue(any(a.get('src') == 'images/portrait-graduation.jpg' for a in portraits))
        self.assertTrue(any('graduation' in a.get('alt', '').lower() for a in portraits))

    def test_internal_links_and_assets_resolve(self):
        ids = [a['id'] for _, a in self.elements if 'id' in a]
        self.assertEqual(len(ids), len(set(ids)), 'Duplicate element IDs')
        for tag, attrs in self.elements:
            for key in ('href', 'src'):
                value = attrs.get(key, '')
                if not value or ':' in value or value.startswith('//'):
                    continue
                with self.subTest(tag=tag, value=value):
                    if value.startswith('#'):
                        self.assertIn(value[1:], ids)
                    else:
                        self.assertTrue((ROOT / value.split('#')[0].split('?')[0]).is_file())

    def test_cv_is_a_valid_pdf_and_downloadable(self):
        downloads = [a for t, a in self.elements if t == 'a' and 'download' in a]
        self.assertTrue(downloads)
        for attrs in downloads:
            path = ROOT / attrs['href']
            self.assertTrue(path.read_bytes().startswith(b'%PDF-'))

    def test_external_links_are_safe_and_images_have_alternatives(self):
        for tag, attrs in self.elements:
            if tag == 'a' and attrs.get('target') == '_blank':
                self.assertTrue({'noopener', 'noreferrer'} & set(attrs.get('rel', '').split()))
            if tag == 'img':
                self.assertIn('alt', attrs)


if __name__ == '__main__':
    unittest.main()
