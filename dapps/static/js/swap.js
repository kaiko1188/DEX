// walletアカウント
let account;

// web3インスタンスを作成
const web3 = new Web3(window.ethereum);

async function connectWallet() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        account = accounts[0];
        console.log(account);
        document.getElementById('account').textContent = account;

        const balance = await getEthBalance(account);
        console.log(balance);
        document.getElementById('ethBalance').textContent = balance;

        // アカウント変更時のイベントリスナー
        window.ethereum.on('accountsChanged', async (accounts) => {
            account = accounts[0];
            document.getElementById('account').textContent = account;
            const balance = await getEthBalance(account);
            document.getElementById('ethBalance').textContent = balance;
        });

        // ネットワーク変更時のイベントリスナー
        window.ethereum.on('chainChanged', async () => {
            const balance = await getEthBalance(account);
            document.getElementById('ethBalance').textContent = balance;
        });
    } catch (error) {
        console.error('Error connecting wallet:', error);
    }
}

async function signERC20SwapTransaction() {
    const contractAddress = "<コントラクトアドレス>";
    let contractABI = await getABIJson();

    if (!contractABI) {
        console.error("ABI is not loaded or invalid.");
        return;
    }

    if (typeof contractABI === 'string') {
        contractABI = JSON.parse(contractABI);
    }

    const contract = new web3.eth.Contract(contractABI, contractAddress);

    // スワップに必要な情報を取得
    const tokenIn = document.getElementById('send-token').value;
    const tokenOut = document.getElementById('recv-token').value;
    let amountIn = document.getElementById('amount').value;
    let amountOut = document.getElementById('tokenValue').textContent;

    // if (!web3.utils.isAddress(tokenIn) || !web3.utils.isAddress(tokenOut)) {
    //     console.error("Invalid token addresses provided.");
    //     return;
    // }

    if (isNaN(amountIn) || isNaN(amountOut)) {
        console.error("Invalid input values for amountIn or amountOut.");
        return;
    }

    try {
        weiMultiplier = 10 ** 9; // 1 ETH = 10^18 Wei
        amountIn = (parseFloat(amountIn) * weiMultiplier); // 小数点を削除して文字列化
        console.log("Amount In (Wei, Integer):", amountIn);
        amountOut = (parseFloat(amountOut) * weiMultiplier); // 小数点を削除して文字列化
        console.log("Amount Out (Wei, Integer):", amountOut);

        const gas = await contract.methods
            .erc20Swap(tokenIn, amountIn, tokenOut, amountOut)
            .estimateGas({ from: account });

        const gasPrice = await web3.eth.getGasPrice();

        const txData = {
            from: account,
            to: contractAddress,
            gas,
            gasPrice,
            data: await contract.methods.erc20Swap(tokenIn, amountIn, tokenOut, amountOut).encodeABI(),
        };

        console.log(txData);
        sendAPITransaction(txData);
    } catch (error) {
        console.error('Error signing transaction:', error);
    }
}

async function sendAPITransaction(tx) {
    try {
        const response = await fetch('/swap/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(tx)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Transaction Result:', result);
    } catch (error) {
        console.error('Error sending transaction:', error);
    }
}

async function getABIJson() {
    try {
        if (!window.abiJsonUrl) {
            throw new Error("ABI JSON URL is not defined.");
        }

        const response = await fetch(window.abiJsonUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch ABI JSON: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching ABI JSON:', error);
    }
}

async function getEthBalance(account) {
    try {
        const balance = await web3.eth.getBalance(account);
        return web3.utils.fromWei(balance, 'ether');
    } catch (error) {
        console.error('Error fetching ETH balance:', error);
        return '0';
    }
}

async function getTokenBalance(account, tokenAddress) {
    try {
        const tokenContract = new web3.eth.Contract(erc20Abi, tokenAddress);
        const balance = await tokenContract.methods.balanceOf(account).call();
        return web3.utils.fromWei(balance, 'mwei'); // USDC/USDTは6桁の小数を使用
    } catch (error) {
        console.error('Error fetching token balance:', error);
        return '0';
    }
}
