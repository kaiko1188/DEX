// walletアカウント
let account;

// web3インスタンスを作成
const web3 = new Web3(window.ethereum);

async function connectWallet() {
    try {
        // await provider.enable(); // ウォレット接続のリクエスト
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        account = accounts[0];
        console.log(account);
        document.getElementById('account').textContent = account;

        const balance = await getEthBalance(account);
        console.log(balance);
        document.getElementById('ethBalance').textContent = balance;

        // アカウント変更時のイベントリスナーを追加
        window.ethereum.on('accountsChanged', function (accounts) {
            account = accounts[0];
            document.getElementById('account').textContent = account;
            balance = getEthBalance(account);
            console.log(balance);
            document.getElementById('ethBalance').textContent = balance;
        });
    
        // ネットワーク変更時のイベントリスナーを追加
        window.ethereum.on('chainChanged', function () {
            balance = getEthBalance(account);
            console.log(balance);
            document.getElementById('ethBalance').textContent = balance;
        });
    } catch (error) {
        console.error('Error connecting wallet:', error);
    }
}

async function signERC20SwapTransaction() {
    const contractAddress = "<コントラクトアドレス>";
    const contractABI =  await getABIJson();
    
     // contractABIが正しく取得できているか確認
     if (!contractABI) {
        throw new Error("ABI is not loaded or invalid.");
    }

    if (typeof contractABI === 'string') {
        contractABI = JSON.parse(contractABI);
    }

    console.log(contractABI);

    const contract = new web3.eth.Contract(contractABI,contractAddress);

    // スワップに必要な情報を取得
    const tokenIn = document.getElementById('send-token').value;
    const tokenOut = document.getElementById('recv-token').value;
    const amountIn = document.getElementById('amount').value;
    const amountOut = document.getElementById('tokenValue').textContent;

    try {
        const txData = {
            from: account,
            to: contractAddress,
            gas: contract.methods.erc20Swap(tokenIn, amountIn, tokenOut, amountOut).estimateGas({ from: account }),
            gasPrice: await web3.eth.getGasPrice(),
            data: await contract.methods.erc20Swap(tokenIn, amountIn, tokenOut, amountOut).encodeABI(),
        }

        sendAPITransaction(txData);
    } catch (error) {
        console.error('Error signing transaction:', error);
    }
}

async function sendAPITransaction(tx){
    try {
        const response = await fetch('/swap/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(tx)
        });
        const result = await response.json();
        console.log('Transaction Result:', result);
    } catch (error) {
        console.error('Error sending transaction:', error);
    }
}

async function getABIJson(){
    // Djangoテンプレートで静的ファイルのURLを取得して変数に代入
    try {
        const response = await fetch(window.abiJsonUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // console.log(data);
        return data;
    } catch (error) {
        console.error('エラー:', error);
    }
}

async function getEthBalance(account) {
    const balance = await web3.eth.getBalance(account);
    // console.log(web3.utils.fromWei(balance, 'gwei'));
    return web3.utils.fromWei(balance, 'ether');
}

async function getTokenBalance(account, tokenAddress) {
    const tokenContract = new web3.eth.Contract(erc20Abi, tokenAddress);
    const balance = await tokenContract.methods.balanceOf(account).call();
    return web3.utils.fromWei(balance, 'mwei'); // USDC/USDTは6桁の小数を使用
}