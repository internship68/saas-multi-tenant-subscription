const axios = require('axios');
const aiKey = 'AIzaSyCO_ezzmpnGi1Ne553KFxB0k1AjkzMXsDM';
axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiKey}`, {
    contents: [{ parts: [{ text: 'Extract info' }] }]
}).then(res => console.log('SUCCESS:', res.data)).catch(err => console.error('ERROR:', err.response ? err.response.data : err.message));
