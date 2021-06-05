require('dotenv').config()
const moment = require('moment');
const cron = require('node-cron');
const axios = require('axios');
const notifier = require('./notifier');
/**
Step 1) Enable application access on your gmail with steps given here:
 https://support.google.com/accounts/answer/185833?p=InvalidSecondFactor&visit_id=637554658548216477-2576856839&rd=1

Step 2) Enter the details in the file .env, present in the same folder

Step 3) On your terminal run: npm i && pm2 start vaccineNotifier.js

To close the app, run: pm2 stop vaccineNotifier.js && pm2 delete vaccineNotifier.js
 */

const PINCODE = process.env.PINCODE
const EMAIL = process.env.EMAIL
const AGE = process.env.AGE

async function main(){
    try {
        cron.schedule('* * * * *', async () => {
             await checkAvailability();
        });
    } catch (e) {
        console.log('an error occured: ' + JSON.stringify(e, null, 2));
        throw e;
    }
}

async function checkAvailability() {
    let pinArray = PINCODE.split(',');
    let datesArray = await fetchNext10Days();

    pinArray.forEach(pin => {
        datesArray.forEach(date => {
            getSlotsForDate(date,pin);
        })
    })
}

function getSlotsForDate(DATE,PIN) {
    let config = {
        method: 'GET',
        url: 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByPin?pincode=' + PIN + '&date=' + DATE,
        headers: {
            'accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
            'Accept-Language': 'hi_IN'
        }
    };

    axios(config)
        .then(function (slots) {
            let sessions = slots.data.sessions;
            let validSlots = sessions.filter(slot => slot.min_age_limit >= AGE && slot.available_capacity_dose1 > 0)

            let logTime = getCurrentTime();
            for(i=0;i<validSlots.length;i++){
                console.log(logTime, "VaccineDate:"+ DATE, "PIN:"+ PIN, "Name:" + validSlots[i].name,"Age:" + validSlots[i].min_age_limit ,"ValidSlots:"+ validSlots[i].available_capacity_dose1);
            }
            if(validSlots.length > 0) {
                notifyMe(validSlots);
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}

async function notifyMe(validSlots){
    let slotDetails = JSON.stringify(validSlots, null, '\t');
    notifier.sendEmail(EMAIL, 'VACCINE AVAILABLE', slotDetails, (err, result) => {
        if(err) {
            console.error({err});
        }
    })
};

async function fetchNext10Days(){
    let dates = [];
    let today = moment()
    for(let i = 0 ; i < 10 ; i ++ ){
        let dateString = today.format('DD-MM-YYYY');
        dates.push(dateString);
        today.add(1, 'day');
    }
    return dates;
}

async function fetchForPinCode(pincode){
    let pinArray = pincode.split(',');

    for(let i = 0 ; i < pinArray.length  ; i ++ ){
        let dateString = today.format('DD-MM-YYYY')
        dates.push(dateString);
        today.add(1, 'day');
        }
    return dates;
}

function getCurrentTime(){
    let date = moment().utcOffset("+05:30").format('DD-MM-YYYY,h:mm:ss a');
    return date;
}

main()
    .then(() => {console.log('Vaccine availability checker started.');});
