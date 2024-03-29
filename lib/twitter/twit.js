const Twit = require('twit');
const Quote = require('../models/quotes');
const fs = require('fs');
const requestParser = require('../services/request-parser');
const b64content = fs.readFileSync('./assets/votebuttonstweetpiuc.jpg', { encoding: 'base64' });
module.exports = function twitBot(){
  try {

    const T = new Twit({
      consumer_key: process.env.APPLICATION_CONSUMER_KEY,
      consumer_secret: process.env.APPLICATION_CONSUMER_SECRET,
      access_token: process.env.ACCESS_TOKEN,
      access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    });
    const targetUser = process.env.TWITTER_FOLLOW_USER;
    const ourBot = process.env.BOT_ID;
    const dataStream = T.stream('statuses/filter', { follow: [targetUser, ourBot] });

    dataStream.on('tweet', async(tweet) => { 
      if(tweet.user.id_str === targetUser){
        const randomNumber = Math.ceil(Math.random() * 25);
        Quote.findById(randomNumber)
          .then(randomQuote => {
            T.post('media/upload', { media_data: b64content }, (err, data, response) => {
              const mediaIdStr = data.media_id_string;
              const altText = 'TEXT <your state name> TO 503-832-6669.';
              const meta_params = { media_id: mediaIdStr, alt_text: { text: altText } };
       
              T.post('media/metadata/create', meta_params, (err, data, response) => {
                if(!err) {
           
                  const params = { status: `${randomQuote.quote}\n-${randomQuote.author}\n#Election2020 #Vote #Vote2020`, media_ids: [mediaIdStr] };
       
                  T.post('statuses/update', params, (err, data, response) => {
                    console.log(data);
                  });
                } else console.log(err);
          
              });
            });
      
          });
      } else if(tweet.in_reply_to_user_id_str === ourBot && tweet.user.id_str !== ourBot) {
        const foundState = await requestParser(tweet.text.slice(tweet.text.indexOf(' ') + 1));
      
        if(foundState) {
          const params = { status: `@${tweet.user.screen_name} ${foundState.regUrl} ${foundState.checkRegUrl ? '\ncheck registration: ' + foundState.checkRegUrl : ''} ${foundState.abReqUrl ? '\nabsentee ballot request: ' + foundState.abReqUrl : ''}`, in_reply_to_status_id: tweet.id_str }; 
          T.post('statuses/update', params, (err, data, response) => {
            console.log(data);
          });
        } else { 
          const params = { status: `@${tweet.user.screen_name} We were unable to process your request. Please reply with the full name of your state.`, in_reply_to_status_id: tweet.id_str };
        
          T.post('statuses/update', params, (err, data, response) => {
            console.log(data);
          });
        }
       
      } 

    

    });
  } catch(error) {
    console.log(error.message);
  }
};
