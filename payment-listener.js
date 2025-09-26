try {
    const paymentChannel = new BroadcastChannel('tabmangment_payment');

    paymentChannel.onmessage = async (event) => {
        if (event.data && event.data.type === 'PAYMENT_SUCCESS') {

            try {

                await chrome.runtime.sendMessage({
                    type: 'PAYMENT_SUCCESS_BROADCAST',
                    sessionId: event.data.sessionId,
                    email: event.data.email,
                    timestamp: event.data.timestamp
                });

            } catch (error) {

            }
        }
    };

} catch (error) {

}

let lastCheck = 0;
setInterval(() => {
    try {
        const now = Date.now();

        if (now - lastCheck < 5000) return;
        lastCheck = now;

        const paymentData = localStorage.getItem('tabmangment_payment_success');
        if (paymentData) {
            const payment = JSON.parse(paymentData);

            if (!payment.processed && payment.timestamp) {
                const paymentTime = new Date(payment.timestamp).getTime();
                const timeDiff = now - paymentTime;

                if (timeDiff < 10 * 60 * 1000) {

                    chrome.runtime.sendMessage({
                        type: 'PAYMENT_SUCCESS_STORAGE',
                        sessionId: payment.sessionId,
                        email: payment.email,
                        timestamp: payment.timestamp
                    }).then(() => {

                        payment.processed = true;
                        localStorage.setItem('tabmangment_payment_success', JSON.stringify(payment));

                    }).catch(error => {

                    });
                }
            }
        }
    } catch (error) {

    }
}, 5000);
