// ==============================
// walletアカウント
// ==============================
let account;

// Web3インスタンス
const web3 = new Web3(window.ethereum);


// ==============================
// MetaMask接続
// ==============================
async function connectWallet() {
    try {

        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        account = accounts[0];

        console.log("Connected account:", account);

        document.getElementById('account').textContent = account;


        const balance = await getEthBalance(account);

        console.log("ETH balance:", balance);

        document.getElementById('ethBalance').textContent = balance;


        // アカウント変更時
        window.ethereum.on('accountsChanged', async (accounts) => {

            if (accounts.length === 0) {
                account = null;
                return;
            }

            account = accounts[0];

            document.getElementById('account').textContent = account;

            const balance = await getEthBalance(account);

            document.getElementById('ethBalance').textContent = balance;
        });


        // ネットワーク変更時
        window.ethereum.on('chainChanged', async () => {

            if (!account) {
                return;
            }

            const balance = await getEthBalance(account);

            document.getElementById('ethBalance').textContent = balance;
        });

    } catch (error) {

        console.error(
            'Error connecting wallet:',
            error
        );

    }
}


// ==============================
// Swap
// ==============================
async function signERC20SwapTransaction() {

    const contractAddress =
        "0x65D4bBb74F7DaC2f506054A1CB4CbF5837D1FE77";   // DEXコントラクトアドレス


    // ABI取得
    let contractABI = await getABIJson();

    if (!contractABI) {
        console.error("ABI is not loaded or invalid.");
        return;
    }


    if (typeof contractABI === 'string') {
        contractABI = JSON.parse(contractABI);
    }


    // コントラクト
    const contract = new web3.eth.Contract(
        contractABI,
        contractAddress
    );


    // ==============================
    // 入力値取得
    // ==============================

    const tokenIn =
        document.getElementById('send-token').value;

    const tokenOut =
        document.getElementById('recv-token').value;

    const amountIn =
        document.getElementById('amount').value;

    const amountOut =
        document.getElementById('tokenValue').textContent;


    console.log("========== SWAP DEBUG ==========");
    console.log("tokenIn:", tokenIn);
    console.log("tokenOut:", tokenOut);
    console.log("amountIn:", amountIn);
    console.log("amountOut:", amountOut);
    console.log("account:", account);
    console.log("=================================");


    // ==============================
    // 入力チェック
    // ==============================

    if (!account) {
        console.error("MetaMaskが接続されていません。");
        return;
    }


    if (tokenIn === tokenOut) {
        console.error("同じトークン同士は交換できません。");
        return;
    }


    if (
        amountIn === "" ||
        amountOut === "" ||
        isNaN(amountIn) ||
        isNaN(amountOut)
    ) {
        console.error(
            "Invalid input values for amountIn or amountOut."
        );
        return;
    }


    try {

        // ==============================
        // amountInを最小単位へ変換
        // ==============================

        let amountInSmallest;

        if (tokenIn === "ETH") {

            // ETH = 18 decimals

            amountInSmallest = web3.utils.toWei(
                amountIn.toString(),
                'ether'
            );

        } else {

            // USDC / USDT = 6 decimals

            amountInSmallest = Math.round(
                parseFloat(amountIn) * 10 ** 6
            ).toString();

        }


        // ==============================
        // amountOutを最小単位へ変換
        // ==============================

        let amountOutSmallest;

        if (tokenOut === "ETH") {

            // ETH = 18 decimals

            amountOutSmallest = web3.utils.toWei(
                amountOut.toString(),
                'ether'
            );

        } else {

            // USDC / USDT = 6 decimals

            amountOutSmallest = Math.round(
                parseFloat(amountOut) * 10 ** 6
            ).toString();

        }


        console.log(
            "amountInSmallest:",
            amountInSmallest
        );

        console.log(
            "amountOutSmallest:",
            amountOutSmallest
        );
        // ==============================
        // ERC20 Approve
        // ==============================

        // ETHはERC20ではないのでApprove不要
        if (tokenIn !== "ETH") {

            // ERC20のABIを取得
            const erc20ABI = await getERC20ABIJson();

            // トークンアドレスを取得
            let tokenAddress;

            if (tokenIn === "USDC") {
                tokenAddress = window.USDC_CONTRACT_ADDRESS;
            } else if (tokenIn === "USDT") {
                tokenAddress = window.USDT_CONTRACT_ADDRESS;
            } else {
                throw new Error("未対応のトークンです。");
            }

            // アドレス確認
            if (!web3.utils.isAddress(tokenAddress)) {
                throw new Error(
                    `${tokenIn}のコントラクトアドレスが不正です。`
                );
            }


            const tokenContract = new web3.eth.Contract(
                erc20ABI,
                tokenAddress
            );

            // 必要な数量だけApprove
            const approvalReceipt = await tokenContract.methods
                .approve(
                    contractAddress,
                    amountInSmallest
                )
                .send({
                    from: account
                });

            console.log(
                "Approve completed:",
                approvalReceipt.transactionHash
            );

            if (
                approvalReceipt.status === false ||
                approvalReceipt.status === "0x0"
            ) {
                throw new Error("Approveに失敗しました。");
            }
        }


        


        // ==============================
        // MetaMaskからSwapを実行
        // ==============================

        const swapReceipt = await contract.methods
            .erc20Swap(
                tokenIn,
                amountInSmallest,
                tokenOut,
                amountOutSmallest
            )
            .send({
                from: account
            });

        console.log(
            "Swap transaction:",
            swapReceipt.transactionHash
        );

        if (
            swapReceipt.status === false ||
            swapReceipt.status === "0x0"
        ) {
            throw new Error("Swapに失敗しました。");
        }

        alert(
            "スワップが完了しました。\n" +
            "Transaction Hash: " +
            swapReceipt.transactionHash
        );


        // ==============================
        // Djangoへ送るデータ
        // ==============================

        /*const txData = {

            // MetaMaskアカウント
            from: account,

            // DEXコントラクト
            to: contractAddress,

            gas: gas,

            gasPrice: gasPrice,

            // Solidityの関数を呼ぶためのdata
            data: await contract.methods
                .erc20Swap(
                    tokenIn,
                    amountInSmallest,
                    tokenOut,
                    amountOutSmallest
                )
                .encodeABI(),

            // Django側で使用
            token_in: tokenIn,
            token_out: tokenOut,
            amount: amountIn
        };


        console.log("========== TX DATA ==========");
        console.log(txData);
        console.log("=============================");


        // Djangoへ送信
        await sendAPITransaction(txData);
        /*

    } catch (error) {

        console.error(
            "Error creating transaction:",
            error
        );

    }
}


// ==============================
// Djangoへトランザクション送信
// ==============================
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


        const result = await response.json();


        console.log(
            "Transaction Result:",
            result
        );


        if (!response.ok) {

            throw new Error(
                result.message ||
                result.error ||
                `HTTP error! status: ${response.status}`
            );

        }


    } catch (error) {

        console.error(
            "Error sending transaction:",
            error
        );

    }
}


// ==============================
// ABI取得
// ==============================
async function getABIJson() {

    try {

        if (!window.abiJsonUrl) {

            throw new Error(
                "ABI JSON URL is not defined."
            );

        }


        const response =
            await fetch(window.abiJsonUrl);


        if (!response.ok) {

            throw new Error(
                `Failed to fetch ABI JSON: ${response.status}`
            );

        }


        return await response.json();


    } catch (error) {

        console.error(
            "Error fetching ABI JSON:",
            error
        );

    }
}
// ==============================
// ERC20 ABI取得
// ==============================
async function getERC20ABIJson() {
    try {
        const response = await fetch(
            '/static/json/ERC20_abi.json'
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch ERC20 ABI: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {
        console.error(
            "Error fetching ERC20 ABI:",
            error
        );

        throw error;
    }
}


// ==============================
// ETH残高取得
// ==============================
async function getEthBalance(account) {

    try {

        const balance =
            await web3.eth.getBalance(account);


        return web3.utils.fromWei(
            balance,
            'ether'
        );


    } catch (error) {

        console.error(
            "Error fetching ETH balance:",
            error
        );

        return '0';

    }
}


// ==============================
// ERC20残高取得
// ==============================
async function getTokenBalance(
    account,
    tokenAddress
) {

    try {

        const tokenContract =
            new web3.eth.Contract(
                erc20Abi,
                tokenAddress
            );


        const balance =
            await tokenContract.methods
                .balanceOf(account)
                .call();


        return web3.utils.fromWei(
            balance,
            'mwei'
        );


    } catch (error) {

        console.error(
            "Error fetching token balance:",
            error
        );

        return '0';

    }
}