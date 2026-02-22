const axios = require('axios');
(async () => {
    try {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCO_ezzmpnGi1Ne553KFxB0k1AjkzMXsDM';
        console.log('Fetching', url);
        const r = await axios.post(url, {
            contents: [{ parts: [{ text: 'hello' }] }]
        });
        console.log('Status', r.status);
        console.log('Data', JSON.stringify(r.data));
    } catch (e) {
        console.log('Error status', e.response?.status);
        console.log('Error data', JSON.stringify(e.response?.data));
    }
})();
