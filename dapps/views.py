from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from myproject import settings
from web3 import Web3
import json
import requests
import os


# ===== 設定 =====
# 本番では環境変数から読み込む（例: export CMC_API_KEY=xxx）
API_KEY      = os.environ.get('CMC_API_KEY', '3eb8e3be-cd3b-44bb-8612-07468b905d8a')
#ALCHEMY_KEY  = os.environ.get('ALCHEMY_API_KEY', 'IDS-YGcEPGAZC4J0lmjq_i2W31hTIGLm')

ALCHEMY_API_KEY = settings.ALCHEMY_API_KEY
# Alchemy URL
ALCHEMY_URL = f"https://eth-sepolia.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
# Web3接続
web3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

# トークンペアの種類を判定するヘルパー
STABLECOINS = {'USDC', 'USDT'}

def get_eth_usd_price():
    """CoinMarketCap から ETH/USD の価格を取得する"""
    url = f'{API_URL}?symbol=ETH&convert=USD'
    headers = {
        'X-CMC_PRO_API_KEY': API_KEY,
        'Accept': 'application/json',
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # HTTPエラーを例外として投げる
    data = response.json()
    return data['data']['ETH']['quote']['USD']['price']


def index(request):
    """ホームページ"""
    return render(request, 'index.html')


@csrf_exempt
def tokenPair(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=400)

    try:
        send_token = request.POST.get('send_token')
        recv_token = request.POST.get('recv_token')
        amount     = float(request.POST.get('amount', 0))

        # 同じトークン同士はNG
        if send_token == recv_token:
            return JsonResponse({'error': 'Invalid token pair'}, status=400)

        # ペアの種類で分岐
        if send_token in STABLECOINS and recv_token in STABLECOINS:
            # USDC <-> USDT: 1:1
            price = amount

        elif send_token == 'ETH' and recv_token in STABLECOINS:
            # ETH -> USDC/USDT
            eth_price = get_eth_usd_price()
            price = eth_price * amount

        elif send_token in STABLECOINS and recv_token == 'ETH':
            # USDC/USDT -> ETH
            eth_price = get_eth_usd_price()
            price = amount / eth_price

        else:
            return JsonResponse({'error': f'Unsupported token pair: {send_token}/{recv_token}'}, status=400)

        return JsonResponse({'eth_usdc_price': round(price, 4)})

    except ValueError:
        return JsonResponse({'error': 'Invalid amount'}, status=400)
    except requests.RequestException as e:
        return JsonResponse({'error': f'API request failed: {str(e)}'}, status=502)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

#from .blockchain import DEX
#dex = DEX()
@csrf_exempt
def swap(request):
    if request.method != 'POST':
        return JsonResponse(
            {'error': 'Invalid request method'},
            status=400
        )

    try:
        # フロントからJSONを受け取る
        data = json.loads(request.body)

        print("========== SWAP BACKEND DEBUG ==========")
        print("data:", data)

        token_in = data.get('token_in')
        token_out = data.get('token_out')
        amount = data.get('amount')

        print("token_in:", token_in)
        print("token_out:", token_out)
        print("amount:", amount)
        print("========================================")


        # ==============================
        # ② 入力チェック
        # ==============================

        if not token_in or not token_out or not amount:

            return JsonResponse(
                {'error': 'Missing swap parameters'},
                status=400
            )


        if token_in == token_out:

            return JsonResponse(
                {'error': 'Invalid token pair'},
                status=400
            )


        # ==============================
        # ③ ABI読み込み
        # ==============================

        contract_path = os.path.join(
            settings.BASE_DIR,
            'dapps',
            'static',
            'json',
            'contract_abi.json'
        )
        with open(contract_path, 'r', encoding='utf-8') as f:
                contract_abi = json.load(f)


        # ==============================
        # ④ DEXアドレス
        # ==============================

        contract_address = os.environ.get('DEX_CONTRACT_ADDRESS')

        print("DEX_CONTRACT_ADDRESS:", contract_address)

        if not contract_address:
            return JsonResponse(
                {'error': 'DEX_CONTRACT_ADDRESS is not set'},
                status=500
            )

        contract_address = Web3.to_checksum_address(
            contract_address
        )


        # ==============================
        # ⑤ ABI読み込み
        # ==============================

        contract_path = os.path.join(
            settings.BASE_DIR,
            'dapps',
            'static',
            'json',
            'contract_abi.json'
        )

        print("ABI path:", contract_path)

        with open(contract_path, 'r', encoding='utf-8') as f:
            contract_abi = json.load(f)


        # ==============================
        # ⑥ DEXコントラクト
        # ==============================

        dex_contract = web3.eth.contract(
            address=contract_address,
            abi=contract_abi
        )


        # ==============================
        # ⑦ 送信者
        # ==============================

        sender_address = os.environ.get(
            'SENDER_ADDRESS'
        )

        private_key = os.environ.get(
            'PRIVATE_KEY'
        )

        print("SENDER_ADDRESS:", sender_address)
        print("PRIVATE_KEY exists:", bool(private_key))

        if not sender_address:
            return JsonResponse(
                {'error': 'SENDER_ADDRESS is not set'},
                status=500
            )

        if not private_key:
            return JsonResponse(
                {'error': 'PRIVATE_KEY is not set'},
                status=500
            )

        sender_address = Web3.to_checksum_address(
            sender_address
        )

        USDC_ADDRESS = os.environ.get('USDC_CONTRACT_ADDRESS')
        USDT_ADDRESS = os.environ.get('USDT_CONTRACT_ADDRESS')

        erc20_abi_path = os.path.join(
            settings.BASE_DIR,
            'dapps',
            'static',
            'json',
            'ERC20_abi.json'
        )

        with open(erc20_abi_path, 'r', encoding='utf-8') as f:
            erc20_abi = json.load(f)

        usdc_contract = web3.eth.contract(
            address=USDC_ADDRESS,
            abi=erc20_abi
        )

        usdt_contract = web3.eth.contract(
            address=USDT_ADDRESS,
            abi=erc20_abi
        )

        usdc_balance = usdc_contract.functions.balanceOf(
            sender_address
        ).call()

        usdc_allowance = usdc_contract.functions.allowance(
            sender_address,
            contract_address
        ).call()

        usdt_balance = usdt_contract.functions.balanceOf(
            contract_address
        ).call()

        print("========== TOKEN DEBUG ==========")

        print(
            "USDC balance:",
            usdc_balance,
            "(",
            usdc_balance / 10**6,
            "USDC)"
        )

        print(
            "USDC allowance:",
            usdc_allowance,
            "(",
            usdc_allowance / 10**6,
            "USDC)"
        )

        print(
            "DEX USDT balance:",
            usdt_balance,
            "(",
            usdt_balance / 10**6,
            "USDT)"
        )

        print("=================================")

        #=============================
        # ⑧ amount_in計算
        #=============================
                # ERC20はUSDC/USDTともに6桁
        if token_in in STABLECOINS:

            amount_in = int(
                float(amount) * 10**6
            )

        elif token_in == 'ETH':

            amount_in = Web3.toWei(
                float(amount),
                'ether'
            )

        else:

            return JsonResponse(
                {
                    'error':
                    f'Unsupported token pair: '
                    f'{token_in}/{token_out}'
                },
                status=400
            )


        # amount_out計算
        if (
            token_in in STABLECOINS
            and token_out in STABLECOINS
        ):

            # USDC → USDT
            # USDT → USDC

            amount_out = int(
                float(amount) * 10**6
            )


        elif (
            token_in == 'ETH'
            and token_out in STABLECOINS
        ):

            # ETH → USDC / USDT

            eth_price = get_eth_usd_price()

            amount_out = int(
                float(amount)
                * eth_price
                * 10**6
            )


        elif (
            token_in in STABLECOINS
            and token_out == 'ETH'
        ):

            # USDC / USDT → ETH

            eth_price = get_eth_usd_price()

            amount_out = Web3.toWei(
                float(amount) / eth_price,
                'ether'
            )


        else:

            return JsonResponse(
                {
                    'error':
                    f'Unsupported token pair: '
                    f'{token_in}/{token_out}'
                },
                status=400
            )


        print("amount_in:", amount_in)
        print("amount_out:", amount_out)


        # ==============================
        # ⑨ nonce
        # ==============================

        nonce = web3.eth.get_transaction_count(
            sender_address,
            'pending'
        )


        # ==============================
        # ⑩ トランザクション作成
        # ==============================

        tx = dex_contract.functions.erc20Swap(

            token_in,
            amount_in,

            token_out,
            amount_out

        ).build_transaction({

            'from': sender_address,

            'nonce': nonce,

            'gas': 2000000,

            'gasPrice': web3.eth.gas_price

        })


        # ==============================
        # ⑪ 署名
        # ==============================

        signed_tx = web3.eth.account.sign_transaction(
            tx,
            private_key
        )


        # ==============================
        # ⑫ 送信
        # ==============================

        tx_hash = web3.eth.send_raw_transaction(
            signed_tx.raw_transaction
        )


        # ==============================
        # ⑬ 完了待ち
        # ==============================

        receipt = web3.eth.wait_for_transaction_receipt(
            tx_hash
        )
        print("TRANSACTION STATUS:", receipt.status)
        print("TRANSACTION RECEIPT:", receipt)
        #辞書｛｝キー：値
        return JsonResponse({

            "status": "success",

            "tx_hash": tx_hash.hex()

           #"receipt": dict(receipt)
           #blockchainに送ったトランザクションが最終的にどうなったかを確認するための情報が含まれる
           #必要であればフロント側でsepolia.etherscan.ioなどで確認できるからリンク作ればよい
         })


    except json.JSONDecodeError:

        return JsonResponse(
            {'error': 'Invalid JSON'},
            status=400
        )


    except Exception as e:

        print("SWAP ERROR:", str(e))

        return JsonResponse({

            "status": "error",

            "message": str(e)

        }, status=500)