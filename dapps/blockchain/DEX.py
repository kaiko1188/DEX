from web3 import Web3
import json
from django.conf import settings

# Alchemy APIキー
ALCHEMY_API_KEY = settings.ALCHEMY_API_KEY

# Alchemy URL
ALCHEMY_URL = f"https://eth-sepolia.g.alchemy.com/v2/{ALCHEMY_API_KEY}"

# Web3接続
w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

# 接続確認
if w3.is_connected():
    print("Connected to Alchemy")
else:
    print("Could not connect to Alchemy")

# ABI読み込み
with open('build/DEX_abi.json', 'r') as abi_file:
    contract_abi = json.load(abi_file)

# DEXコントラクトアドレス
contract_address = settings.DEX_CONTRACT_ADDRESS 

# checksum address(Ethの標準形式)へ変換
contract_address = Web3.to_checksum_address(contract_address)

# コントラクト作成
dex_contract = w3.eth.contract(
    address=contract_address,
    abi=contract_abi
)

# 送信者アドレス
sender_address = "0xBaB502f7b2e443A135b77631Fc871aA402925a03"

# checksum addressへ変換
sender_address = Web3.to_checksum_address(sender_address)

# 秘密鍵
private_key = "8f5d4c03ac59f8d0f276cb0ab9313fd7a9598296c8f3af064c5cc76833d4a17b"
# swap内容
token_in = "USDC"

# USDC 1枚 (6 decimals)
amount_in = 1000000

token_out = "ETH"

# 0.001 ETH
amount_out = w3.to_wei('0.001', 'ether')

# nonce取得
nonce = w3.eth.get_transaction_count(sender_address)

# transaction作成
tx = dex_contract.functions.erc20Swap(
    token_in,
    amount_in,
    token_out,
    amount_out
).build_transaction({

    'from': sender_address,

    'nonce': nonce,

    'gas': 2000000,

    'gasPrice': w3.eth.gas_price
})

# 署名
signed_tx = w3.eth.account.sign_transaction(
    tx,
    private_key
)

# transaction送信
tx_hash = w3.eth.send_raw_transaction(
    signed_tx.raw_transaction
)

# receipt待機
tx_receipt = w3.eth.wait_for_transaction_receipt(
    tx_hash
)


dex_contract.functions.usdcBalanceOf(my_address).call()
dex_contract.functions.usdtBalanceOf(my_address).call()
dex_contract.functions.getETHBalance(my_address).call()




# tx hash表示
print(f"Transaction successful with hash: {tx_hash.hex()}")
print("Contract address:", contract_address)

for func in dex_contract.all_functions():
    print(func)
print("Functions in ABI:")

for func in dex_contract.all_functions():
    print(func)
