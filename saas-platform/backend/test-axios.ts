import axios from 'axios';
async function test() {
    try {
        const res = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCO_ezzmpnGi1Ne553KFxB0k1AjkzMXsDM', {
            contents: [{ parts: [{ text: 'Extract info' }] }]
        });
        console.log('SUCCESS:', JSON.stringify(res.data));
    } catch (e: any) {
        console.log('AXIOS ERROR:', e.response?.status, JSON.stringify(e.response?.data) || e.message);
    }
}
test();
