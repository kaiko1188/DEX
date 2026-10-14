function fetchPrices() {
    const send_token = document.getElementById('send-token').value;
    const recv_token = document.getElementById('recv-token').value;
    const amount = document.getElementById('amount').value;

    const formData = new FormData();
    formData.append('send_token', send_token);
    formData.append('recv_token', recv_token);
    formData.append('amount', amount);

    fetch('/tokenPair/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => {
        if(!response.ok) {
            if(response.error === 'Invalid token pair') {
                console.log('失敗：Invalid token pair');
            }
        }else{
            return response.json();
        }
    })
    .then(data => {
        console.log('成功:', data);
        // alert(data.result);
        console.log(data.eth_usdc_price);
        document.getElementById('tokenValue').textContent = data.eth_usdc_price;
    })
    .catch((error) => {
        console.error('エラー:', error);
        document.getElementById('tokenValue').textContent = "None";
    });
}

document.getElementById('send-token').addEventListener('change', fetchPrices);
document.getElementById('recv-token').addEventListener('change', fetchPrices);
document.getElementById('amount').addEventListener('input', fetchPrices);