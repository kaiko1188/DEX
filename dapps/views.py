from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from web3 import Web3
import json
import requests
import math

# Create your views here.

# CoinMarketCap APIキーを入力してください
API_KEY = '3eb8e3be-cd3b-44bb-8612-07468b905d8a'

# APIエンドポイントとパラメータの設定
API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest'

ALCHEMY_API_KEY = "IDS-YGcEPGAZC4J0lmjq_i2W31hTIGLm"
ALCHEMY_URL = f"https://polygon-amoy.g.alchemy.com/v2/{ALCHEMY_API_KEY}"

web3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

def index(request): 
    """学習 ノート の ホームページ""" 
    return render(request, 'index.html')

@csrf_exempt
def tokenPair(request):
    if request.method == 'POST':
        try:
            symbols1 = request.POST.get('send_token')
            symbols2 = request.POST.get('recv_token')
            amount = request.POST.get('amount')
            symbols = 'ETH'
            currency = 'USD'

            if(symbols1 != symbols2):
                if(symbols1 == 'USDC' and symbols2 == 'USDT' or symbols1 == 'USDT' and symbols2 == 'USDC'):
                    price = float(amount)
                else:
                    REQUEST_URL = f'{API_URL}?symbol={symbols}&convert={currency}'
                    # CoinMarketCap APIにリクエストを送信
                    headers = {
                        'X-CMC_PRO_API_KEY': API_KEY,
                        'Accept': 'application/json'
                    }
                    response = requests.get(REQUEST_URL, headers=headers)
                    data = response.json()

                    # 必要なデータを抽出
                    if(symbols1 == 'ETH' and symbols2 == 'USDC' or symbols1 == 'ETH' and symbols2 == 'USDT'):
                        price = data['data']['ETH']['quote']['USD']['price'] * float(amount)
                    elif(symbols1 == 'USDC' and symbols2 == 'ETH' or symbols1 == 'USDT' and symbols2 == 'ETH'):
                        price = float(amount) / data['data']['ETH']['quote']['USD']['price']

                print(price)

                # 結果を返す
                return JsonResponse({
                    'eth_usdc_price': round(price, 10)  # 小数点第2位までに丸める
                })
            else:
                return JsonResponse({'error': 'Invalid token pair'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def swap(request):
    