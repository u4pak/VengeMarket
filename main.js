const Discord = require("discord.js"); //the most popular discord js wrapper
const fetch = require("node-fetch"); //used for fetching from venge api
const { Client } = require("pg"); //database module
const client = new Discord.Client(); //makes discord bot account connection
require("dotenv").config(); //dotenv is the module needed for .env file
setTimeout(() => { // does this every 60 secs
  setStatus(); // sets status
}, 60000);
async function setStatus(){
    client.user.setActivity(`${client.guilds.holds.length} servers  | .help`,{ type:'WATCHING'}) // sets the discord bot's status every 60 secs
}

const db = new Client({ //creates the connection to the db
  host: process.env.DB_HOST, //process.env.variable is the variable saved in my .env file (this is a file where you safe all the secrets that shouldn't be in plane code)
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function checkConnection() { // check if the connection to the db is still up
  if (!db._connected) { //if it is not connected to the db it will connect to it
    db.connect() //connects to database
      .then(() => console.log(`Reconnected to db as ${db.user}`)) //logs if the connection was succecfull
      .catch((err) => console.error("Reconnection error", err.stack));//logs if the connection wasn't succecfull
  }
}

var count = 0; //this is the count of items that are checked
var snipes = 0; //this is the amount of snipes found
var listcount = 0; //this is the amount of venge items in the game

const prefix = "."; //prefix used for the bot

const basicEmb = new Discord.MessageEmbed() //makes a basic embed which will be always used and can be overwriten anytime
.setFooter(`Type ${prefix}invite to invite the bot to your own server!`)
.setColor("#0f3abd")

const rarity = ["common", "uncommon", "rare", "legendary", "mythical"]; //for sorting
const rates = { //rates on when a certain item is a snipe
  common: 0.42,
  uncommon: 0.42,
  rare: 0.34,
  legendary: 0.3,
  mythical: 0.3,
};

client.on("ready", async () => { //if the bot is connected to the discord servers it continues
  console.log(`Logged in as ${client.user.tag}!`); //logs the account name
  checkConnection(); //connects to db (for the future)
  setStatus();
});

client.on("message", async (msg) => {//if a message gets send in a discord server
  if (msg.content.toLowerCase().startsWith(`${prefix}invite`)) { // if the sended message is the prefix then invite it continues
    
    try{//tries doing the following
      msg.author.send("https://discord.com/api/oauth2/authorize?client_id=832628454540181564&permissions=67648&scope=bot")
      msg.reply("Please check your dm's");

    }catch{ //will do the following if it got an error
      msg.channel.send("Please allow me to send you dm's")
    }
  }
  else if (msg.content.toLowerCase().startsWith(`${prefix}help`)) { // if the sended message is the prefix then invite it continues
    
    try{//tries doing the following
      const helpEmb = basicEmb
      .setTitle("Need help? This might help:")
      .setDescription("**💻 Commands:**:\n\n"+
      "**!help** : sends help message in dm.\n"+
      "**!invite** : sends bot invite link in dm.\n"+
      "**!snipe** : shows all the snipes on the market\n\n"+
      "📯 **Support server:**\n\n"+
      "https://discord.com/invite/eNGMCPVtUU")
      msg.author.send(helpEmb)
      msg.reply("Please check your dm's");

    }catch{ //will do the following if it got an error
      msg.channel.send("Please allow me to send you dm's")
    }
  }
  else if (msg.content.toLowerCase().startsWith(`${prefix}snipe`)) { // if the sended message is the prefix then snipe it continues
    count = 0; //sets the count of items that are checked to 0
    snipes = 0; //sets the count of snipes found to 0

    msg.channel.send("Looking for snipes...").then((sendedmsg) => {//sends a message in the discord channel
      const sales = fetch("https://gateway.venge.io/?request=get_skins_list")//gets a list of all the items in venge
        .then((res) => res.json()) //if the request is done and succesfull it gets the json of the result
        .then(async (list) => {
          let items = [];
          listcount = list.result.length; // listcount will be the amount of items there are in venge (this will be used later on)
          list.result.forEach(async (element) => {
            checkitem(element, items); //it checks every item
          });
        });

      async function checkitem(item, items) {
        const params = new URLSearchParams(); //the venge searchskin request needs post parameters so I initialise it here
        params.append("skin_name", `${item.name} - ${item.type}`); //set the skinname to the name of the item
        params.append("prices", "Lowest"); //set the price filter to Lowest so the lowest will be first

        const sales = await fetch("https://gateway.venge.io/?request=search_skins", { method: "POST", body: params })
          .then((res) => res.json()) //if the request is done and succesfull it gets the json of the result
          .then(async (body) => {
            count++; // shows that this item is checked
            if (body.result != undefined) { // if there are some on the market it continues
              if (body.result.length >= 4) {// if there are 4 or more on the market it continues
                let avg = (parseInt(body.result[1].price) + parseInt(body.result[2].price) + parseInt(body.result[3].price)) / 3; //gets the average of the 2nd 3th and 4th cheapest items on the market
                if (parseInt(body.result[0].price) <= avg - avg * rates[body.result[0].rarity.toLowerCase()]) { // if that average is the previously set rate lower then the cheapest item it is seen as a snipe and continues
                  snipes++; // snipe count +1
                  items.push({ // puts the item in the list of all the snipes
                    type: body.result[0].rarity, //the type of the snipe is the rarity of the item
                    rate: parseInt(body.result[0].price) * (avg - avg * rates[body.result[0].rarity.toLowerCase()]), //the rate is calculated with the average and rate of the item to see how good the snipe is
                    msg: `**${body.result[0].name}** (${body.result[0].type}) - **${body.result[0].price}** [${body.result[0].rarity.toUpperCase()}]`, //the message that is shown for that snipe
                  });
                }
              } else {//if there are less then 4 items on the market it goes here
                if (body.result.length == 1 && body.result) { //if there is only one item on the market it continues
                  if (body.result[0].rarity == "Mythical") { //if that item is a mythical it continues
                    if (body.result[0].price <= 30000) { //if a mythical is or is under 30k it is seen as a snipe
                      items.push({// puts the item in the list of all the snipes
                        type: body.result[0].rarity, //the type of the snipe is the rarity of the item
                        rate: 10000000 - body.result[0].price * 5, //the rate is calculated with a set rate mines the price times 5 
                        msg: `**${body.result[0].name}** (${body.result[0].type}) - **${body.result[0].price}** [${body.result[0].rarity.toUpperCase()}]`, //the message that is shown for that snipe
                      });
                      snipes++; // snipe count +1
                    }
                  } else { //if the item is not mythical it goes here
                    snipes++; // snipe count +1
                    items.push({// puts the item in the list of all the snipes
                      type: body.result[0].rarity, //the type of the snipe is the rarity of the item
                      rate: 0, //sets rate to 0 as it can't calculate accurate enough if there is only 1 item
                      msg: `Last one: **${body.result[0].name}** (${body.result[0].type}) - **${body.result[0].price}**`, //the message that is shown for that snipe
                    });
                  }
                }
              }
            }
            if (count == listcount && snipes == 0) { // if there are no snipes
              sendedmsg.edit(`There are no snipes on the market try again later!`); //it edits the "Looking for snipes" message
            } else if (count == listcount) {
              items.sort((a, b) => { // it sorts the snipes on rate to get the biggest snipes first when it deletes the max
                return b.rate - a.rate;
              });

              let max = 1000; //max is set to 1000 as there is no command to change it yet

              if (max > items.length) max = items.length; //if the max is higher then the length of the snipes array it makes the max to the amount of snipes so it doesn't get an error while sliceing
              let snipes = items.slice(0, max); //takes the first max amount of the snipes

              snipes.sort((a, b) => { //sorts the snipes by rarity
                return rarity.indexOf(a.type.toLowerCase()) < rarity.indexOf(b.type.toLowerCase()) ? 1 : -1;
              });
              var description = ""; //initializes the description of the embed
              for (var i = 0; i < max; i++) {
                description += snipes[i].msg + "\r\n"; //adds an item's message to the description and puts an enter behind it
              }
              const snipesEmb = basicEmb //makes an embed
              .setTitle("Current market snipes:") //sets the embed's title
              .setColor(3599421) //sets the embed's color
              .setDescription(description); //sets the embed's description
              msg.channel.send(snipesEmb); //sends the embed to the channel
              sendedmsg.delete(); //deletes the "looking for snipes message"
            }
          })
      }
    });
  }
});

client.login(process.env.TOKEN);