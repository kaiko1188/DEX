// ==============================
// walletアカウント
// ==============================
let account;

// Web3インスタンス
const web3 = new Web3(window.ethereum);
async function checkNetwork() {
    try {
        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });

        console.log("Network Chain ID:", chainId);

    } catch (error) {
        console.error("ネットワーク取得エラー:", error);
    }
}

checkNetwork();


// ==============================
// MetaMask接続
// ==============================
async function connectWallet() {
    try {
        // MetaMaskに接続してアカウントを取得
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
            return;
        }

        account = accounts[0];

        console.log("Connected account:", account);

        // 接続中のアカウントを画面に表示
        document.getElementById('account').textContent = account;

        // ETH・USDC・USDTの残高をまとめて更新
        await updateBalances();


        // アカウント変更時
        // すでに登録済みのイベントを重複登録しないようにする
        if (!window.accountChangedListener) {
            window.accountChangedListener = async (accounts) => {
                if (accounts.length === 0) {
                    account = null;

                    document.getElementById('account').textContent = '未接続';
                    document.getElementById('ethBalance').textContent = '-';
                    document.getElementById('usdcBalance').textContent = '-';
                    document.getElementById('usdtBalance').textContent = '-';

                    return;
                }

                account = accounts[0];

                console.log("Account changed:", account);

                document.getElementById('account').textContent = account;

                await updateBalances();
            };

            window.ethereum.on(
                'accountsChanged',
                window.accountChangedListener
            );
        }


        // ネットワーク変更時
        if (!window.chainChangedListener) {
            window.chainChangedListener = async () => {
                console.log("Network changed:", window.ethereum.chainId);

                if (!account) {
                    return;
                }

                await updateBalances();
            };

            window.ethereum.on(
                'chainChanged',
                window.chainChangedListener
            );
        }

    } catch (error) {
        console.error('Error connecting wallet:', error);
    }
}
async function updateBalances() {
    if (!account) {
        return;
    }

    try {
        // ETH残高を取得
        const ethBalance = await getEthBalance(account);

        document.getElementById('ethBalance').textContent = ethBalance;

        console.log("ETH Balance:", ethBalance);


        // USDC残高を取得
        const usdcAddress = window.USDC_CONTRACT_ADDRESS;

        if (web3.utils.isAddress(usdcAddress)) {
            const usdcBalance = await getTokenBalance(
                account,
                usdcAddress
            );

            document.getElementById('usdcBalance').textContent = usdcBalance;

            console.log("USDC Balance:", usdcBalance);
        } else {
            console.error("USDCのコントラクトアドレスが不正です:", usdcAddress);

            document.getElementById('usdcBalance').textContent = '取得失敗';
        }


        // USDT残高を取得
        const usdtAddress = window.USDT_CONTRACT_ADDRESS;

        if (web3.utils.isAddress(usdtAddress)) {
            const usdtBalance = await getTokenBalance(
                account,
                usdtAddress
            );

            document.getElementById('usdtBalance').textContent = usdtBalance;

            console.log("USDT Balance:", usdtBalance);
        } else {
            console.error("USDTのコントラクトアドレスが不正です:", usdtAddress);

            document.getElementById('usdtBalance').textContent = '取得失敗';
        }

    } catch (error) {
        console.error("残高更新エラー:", error);
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
        // 残高を再取得して画面を更新
        await updateBalances();




    } catch (error) {

        console.error(
            "Error creating transaction:",
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
        if (!window.erc20AbiUrl) {
            throw new Error("ERC20 ABI URL is not defined.");
        }

        const response = await fetch(window.erc20AbiUrl);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch ERC20 ABI: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {
        console.error("Error fetching ERC20 ABI:", error);
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
/*async function getTokenBalance(
    account,
    tokenAddress
) {

    try {

        const erc20ABI = await getERC20ABIJson();

        const tokenContract = new web3.eth.Contract(
            erc20ABI,
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
*/
async function getTokenBalance(account, tokenAddress) {
    try {
        console.log("残高取得開始");
        console.log("Account:", account);
        console.log("Token Address:", tokenAddress);

        const erc20ABI = await getERC20ABIJson();

        console.log("ERC20 ABI:", erc20ABI);

        const tokenContract = new web3.eth.Contract(
            erc20ABI,
            tokenAddress
        );

        const balance = await tokenContract.methods
            .balanceOf(account)
            .call();

        console.log("Raw Token Balance:", balance);

        // USDC・USDTは6 decimalsを想定
        return web3.utils.fromWei(balance, 'mwei');

    } catch (error) {
        console.error("トークン残高取得エラー:", error);
        throw error;
    }
}