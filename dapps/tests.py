from django.test import TestCase
from django.urls import reverse

# Create your tests here.

class tokenPairTest(TestCase):
    def test_tokenPair(self):
        url = reverse('dapps:tokenPair')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'eth_usdc_price')
        # self.assertContains(response, 'error')