"use strict";

const axios = require('axios').default;

const baseapi = axios.create({
    baseURL: 'http://quote.eastmoney.com/zixuan/api/zxg',
    headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,es;q=0.6',
        'Connection': 'keep-alive',
        'Cookie': 'qgqp_b_id=58c602a3f1a566723ed52b33ac835723; isoutside=0; st_si=51789741462972; st_asi=delete; p_origin=https%3A%2F%2Fpassport2.eastmoney.com; ct=Q31g61BxNOX3q76RMv8RgIpoXiEpXpYiMa1EDQtedsTZaaCW__4PlFWnVpdJgT8FpT-G8TUxYrKPYDErW3T3oZVdKoBMirdKl1SPBcG4Et9ymX62NRLLjXKiCd1RLNKqBdQU_W-dJyzfmtXDAhENc0dJK35PuDiWBMc-4p7tRL0; ut=FobyicMgeV6oOlrtxUaVomuHAewclBXvzcE6Fe0WojI5-HsiNzhMi6bDBxjRoKmFaxLZKpUbY8gWtGtzcs1SmOVuPpzJuMKvYsZ-iVH7BNeQAHtz0u14Yjisrbx-PNdiQ4yDzyPl1NXF8U9CuL61gDFXeFbhYos94L6jfy6I_Y8MQ5yat91CuAVdxQCub58z7pw70FjghTqXDkUPWKomNXuAjoWjsfMnRAG-AW9iLGnLg13-kLPjwkS3kQLg__1FlFsc2b3Q869RguULTJkb4d5mbIzdAZ5w; pi=1806645222206800%3bg1806645222206800%3b%e8%82%a1%e5%8f%8b3FMrNG%3bjXLPykg8cHdIaN75CE7CkFEjV9rKKIJ2uGGC5mrULVNkSbW0n898DJWavO%2fD%2brRylptFzxXtFttGa8PLMZwn04rsLw%2fH1ansFUMb9MMwz1X9UOw6uuPcUmnjSRefNNruf9bWokuGKtnbeHLrfjP4rL1YeVdbWMJVXEPUbpd3karJttIFQB1kKFE85wwEcjJqiHTbAEq8%3baJ9E1LvovCgUw2uPglLv6UEMXxL58W4OJyojHZHmjXOOg3f8xJFdz7i%2bEjqyiTrDjbshW9BhF%2bZ6Tm1DIAhjaQRCvRfQgehzDxfdBN9BIuxKRZdzRo6FG%2f4jb9vjbdSSQZroQmxx25qnWbtKW2YzYqB96GBdSg%3d%3d; vtpst=|; sid=122093423; uidal=1806645222206800%e8%82%a1%e5%8f%8b3FMrNG; st_pvi=81889358835586; st_sp=2019-09-14%2008%3A57%3A25; st_inirUrl=https%3A%2F%2Fwww.google.com%2F; st_sn=2; st_psi=20200220200126891-113200301712-2013116170',
        'DNT': '1',
        'Host': 'quote.eastmoney.com',
        'Referer': 'http://quote.eastmoney.com/zixuan/?returnCode=0',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
    },
    responseType: 'json'
});

const getgroups = async function() {
    return baseapi.get('/group');
};

const addtogroup = async function(code) {
    let data = {};
    data.groupid = '168764245';
    if (code > 333333){
        data.stockcode = "1." + code;
    }else{
        data.stockcode = "0." + code;
    }
    return baseapi.post('/addstock', data);
};

module.exports = {getgroups, addtogroup};