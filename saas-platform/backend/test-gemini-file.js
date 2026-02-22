const axios = require('axios');
(async () => {
    try {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCO_ezzmpnGi1Ne553KFxB0k1AjkzMXsDM';
        const r = await axios.post(url, {
            contents: [{ parts: [{ text: 'hello' }] }]
        });
        require('fs').writeFileSync('gemini-test-output.txt', 'SUCCESS: ' + JSON.stringify(r.data, null, 2));
    } catch (e) {
        require('fs').writeFileSync('gemini-test-output.txt', 'ERROR STATUS: ' + e.response?.status + '\nDATA: ' + JSON.stringify(e.response?.data, null, 2));
    }
})();
