const fetch = require("node-fetch");
const tmi = require("tmi.js");
const { Client } = require("pg");
require("dotenv").config();


let current = new Date();
let lastmsg = new Date();

const permNames = ["owner","mod","vip","subscriber","everyone"]

const db = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

var count = 0;
var snipes = 0;
var listcount = 0;

const addChannel = async (channel) => {
  checkConnection().then(async () => {
    try {
      await db.query("INSERT INTO channels(channel) VALUES ($1) ON CONFLICT DO NOTHING", [channel.substring(1)]);
    } catch (e) {
      console.log(e.stack);
    }
  });
};


const setLastMsg = async (channel,time) => {
  checkConnection().then(async () => {
    try {
      await db.query("UPDATE channels SET last_msg = $2 WHERE channel = $1 ", [channel.substring(1),time]);
    } catch (e) {
      console.log(e.stack);
    }
  });
};

const setCooldown = async (channel,cooldown) => {
  checkConnection().then(async () => {
    try {
      await db.query("UPDATE channels SET cooldown = $2 WHERE channel = $1 ", [channel.substring(1),cooldown]);
    } catch (e) {
      console.log(e.stack);
    }
  });
};

const getCooldown = async (channel) => {
  await checkConnection();
  try {
    let res = await db.query("SELECT cooldown FROM channels WHERE channel = $1;", [channel.substring(1)]);
    if (res.rowCount == 0) return 0;
    return res.rows[0].cooldown;
  } catch (e) {
    console.log(e.stack);
  }
};

const getPerms = async (channel) => {
  await checkConnection();
  try {
    let res = await db.query("SELECT perms FROM channels WHERE channel = $1;", [channel.substring(1)]);
    if (res.rowCount == 0) return 0;
    return res.rows[0].perms;
  } catch (e) {
    console.log(e.stack);
  }
};

const setPerms = async (channel,perms) => {
  checkConnection().then(async () => {
    try {
      await db.query("UPDATE channels SET perms = $2 WHERE channel = $1 ", [channel.substring(1),perms]);
    } catch (e) {
      console.log(e.stack);
    }
  });
};

const getCurrentTime = async () => {
  await checkConnection();
  try {
    let res = await db.query("SELECT CURRENT_TIMESTAMP;");
    if (res.rowCount == 0) return 0;
    return res.rows[0].current_timestamp;
  } catch (e) {
    console.log(e.stack);
  }
};

const getLastMsg = async (channel) => {
  await checkConnection();
  try {
    let res = await db.query("SELECT last_msg FROM channels WHERE channel = $1;", [channel.substring(1)]);
    if (res.rowCount == 0) return 0;
    return res.rows[0].last_msg;
  } catch (e) {
    console.log(e.stack);
  }
};

async function checkConnection() {
  if (!db._connected) {
    db.connect()
      .then(() => console.log(`Reconnected to db as ${db.user}`))
      .catch((err) => console.error("Reconnection error", err.stack));
  }
}
//const channels = ["PoweredTV","KaytaAkaSaucy","Tomogunchi","Slim3cube"];
const channels = ["PoweredTV"];
const opts = {
  options: {
    debug: false,
  },
  connection: {
    cluster: "aws",
    reconnect: true,
  },
  identity: {
    username: process.env.USER,
    password: process.env.PASS,
  },
  channels: channels,
};
const client = new tmi.client(opts);
client.connect();
client.on("connected", () => {
  console.log("connected");
  db.connect()
  .then(() => {
    console.log(`Connected to db as ${db.user}`)
    channels.forEach(element => {
      addChannel(element);
    });
    
  })
  .catch((err) => console.error("Connection error", err.stack));
});
client.on("message", async (channel, userstate, message, self) => {
  if (self) return;
  if (message.toLowerCase().startsWith("!setperm")) {
    if(userstate["badges-raw"]==null||!userstate["badges-raw"].includes("broadcaster/1")){
      client.say(channel, `Only channel owners can use this command.`);
      return;
    }
    let perms = message.split(" ")[1]!=undefined?message.split(" ")[1]:null;
    switch(perms.toLowerCase()){
      case "all":
        setPerms(channel,4);
        client.say(channel, `!snipe permission set to ${perms.toLowerCase()}.`);
        break;
      case "everyone":
        setPerms(channel,4);
        client.say(channel, `!snipe permission set to ${perms.toLowerCase()}.`);
        break;
      case "sub":
        setPerms(channel,3);
        client.say(channel, `!snipe permission set to ${perms.toLowerCase()}.`);
        break;
      case "subscriber":
        setPerms(channel,3);
        client.say(channel, `!snipe permission set to ${perms.toLowerCase()}.`);
        break;
      case "vip":
        setPerms(channel,2);
        client.say(channel, `!snipe permission set to ${perms.toLowerCase()}.`);
        break;
      case "mod":
        setPerms(channel,1);
        client.say(channel, `!snipe permission set to ${perms.toLowerCase()}.`);
        break;
      case "owner":
        setPerms(channel,0);
        client.say(channel, `!snipe permission set to ${perms.toLowerCase()}.`);
        break;
      case "me":
        setPerms(channel,0);
        client.say(channel, `!snipe permission set to ${perms.toLowerCase()}.`);
        break;
      default:
        client.say(channel, `Please use the command as following: !setperm`);
        break;
    }
  }
  if(message.toLowerCase().startsWith("!bot")||message.toLowerCase().startsWith("!vengebot")){
    client.say(channel, `Support Discord - https://discord.gg/eNGMCPVtUU`);
  }
  if(message.toLowerCase().startsWith("!docs")||message.toLowerCase().startsWith("!documentation")||message.toLowerCase().startsWith("!command")){
    client.say(channel, `Documentation - https://powered.gitbook.io/venge-market`);
  }
  if (message.toLowerCase().startsWith("!setcooldown")) {
    if(userstate["badges-raw"]==null){
      client.say(channel, `Only channel owners can use this command.`);
      return;
    }
    if(userstate["badges-raw"].includes("broadcaster/1")){
      let time = message.split(" ")[1]!=undefined?message.split(" ")[1]:null;
      if(time!=null){
        time = Math.floor(Number(time));
        if(time !== Infinity && time >= 0){
          if(time > 20){
            client.say(channel, `Cooldown set to ${time} sec!`);
            setCooldown(channel,time)
          }else{
            client.say(channel, `Cooldown has to be higher then 20 sec!`);
          }
        }else{
          client.say(channel, `Please use a number!`);
        }
      }else{
        client.say(channel, `Please use the command like: !setcooldown 69`);
      }
    }else{
      client.say(channel, `Only channel owners can use this command.`);
    }
  }
  if (message.toLowerCase().startsWith("!cooldown")) {
    client.say(channel,`The cooldown is ${await getCooldown(channel)}. To change this say !setcooldown 'Cooldown'`)
    await getCooldown()
  }
  if (message.toLowerCase().startsWith("!snipe")) {
    count = 0;
    snipes = 0;
    const perm = await getPerms(channel);
    let allowed = true;
    switch(perm){
      case 3:
        if(userstate["badges-raw"]==null){
          allowed=false;
          break;
        } 
        if(!userstate["badges-raw"].includes("subscriber")&&!userstate["badges-raw"].includes("vip")&&!userstate.mod&&!userstate["badges-raw"].includes("broadcaster/1")) allowed=false;
        break;
      case 2:
        if(userstate["badges-raw"]==null){
          allowed=false;
          break;
        } 
        if(!userstate["badges-raw"].includes("vip")&&!userstate.mod&&!userstate["badges-raw"].includes("broadcaster/1")) allowed=false;
        break;
      case 1:
        if(userstate["badges-raw"]==null){
          allowed=false;
          break;
        } 
        if(!userstate.mod&&!userstate["badges-raw"].includes("broadcaster/1")) allowed=false;
        break;
      case 0:
        if(userstate["badges-raw"]==null){
          allowed=false;
          break;
        } 
        if(!userstate["badges-raw"].includes("broadcaster/1")) allowed=false;
        break;
    }

    if(!allowed){
      client.say(channel,`Only ${permNames[perm]}s and higher roles are allowed to use this command.`);
      return;
    }

    current = await getCurrentTime();
    lastmsg = await getLastMsg(channel);
    cooldown = await getCooldown(channel);
    let Difference_In_Time = (current - lastmsg) / 1000;
    if (Difference_In_Time < cooldown) {
      client.say(channel, `You have to wait ${Math.round(cooldown - Difference_In_Time)} sec to do this again.`);
      return;
    }
    setLastMsg(channel,current);
    const sales = fetch("https://gateway.venge.io/?request=get_skins_list")
      .then((res) => res.json())
      .then(async (list) => {
        let items = {
          Common: [],
          Uncommon: [],
          Rare: [],
          Legendary: [],
          Mythical: [],
        };
        listcount = list.result.length;
        await list.result.forEach(async (element) => {
          await checkitem(element, items, list);
        });
      });

    async function checkitem(item, items, list) {
      const params = new URLSearchParams();
      params.append("skin_name", `${item.name} - ${item.type}`);
      params.append("prices", "Lowest");

      const sales = await fetch("https://gateway.venge.io/?request=search_skins", { method: "POST", body: params })
        .then((res) => res.json())
        .then(async (body) => {
          count++;
          if (body.result != undefined) {
            if (body.result.length >= 4) {
              let avg = 0;
              switch (body.result[0].rarity) {
                case "Common":
                  avg = (parseInt(body.result[1].price) + parseInt(body.result[2].price) + parseInt(body.result[3].price)) / 3;
                  if (parseInt(body.result[0].price) <= avg - avg * 0.38) {
                    snipes++;
                    client.say(channel, `${body.result[0].name} (${body.result[0].type}) - ${body.result[0].price} [${body.result[0].rarity.toUpperCase()}]`);
                  }
                  break;
                case "Uncommon":
                  avg = (parseInt(body.result[1].price) + parseInt(body.result[2].price) + parseInt(body.result[3].price)) / 3;
                  if (parseInt(body.result[0].price) <= avg - avg * 0.38) {
                    snipes++;
                    client.say(channel, `${body.result[0].name} (${body.result[0].type}) - ${body.result[0].price} [${body.result[0].rarity.toUpperCase()}]`);
                  }
                  break;
                case "Rare":
                  avg = (parseInt(body.result[1].price) + parseInt(body.result[2].price)) / 2;
                  if (parseInt(body.result[0].price) <= avg - avg * 0.32) {
                    snipes++;
                    client.say(channel, `${body.result[0].name} (${body.result[0].type}) - ${body.result[0].price} [${body.result[0].rarity.toUpperCase()}]`);
                  }
                  break;
                case "Legendary":
                  avg = (parseInt(body.result[1].price) + parseInt(body.result[2].price) + parseInt(body.result[3].price)) / 3;
                  if (parseInt(body.result[0].price) <= avg - avg * 0.28) {
                    snipes++;
                    client.say(channel, `${body.result[0].name} (${body.result[0].type}) - ${body.result[0].price} [${body.result[0].rarity.toUpperCase()}]`);
                  }
                  break;
                case "Mythical":
                  if (body.result[0].price <= 30000) {
                    snipes++;
                    client.say(channel, `${body.result[0].name} (${body.result[0].type}) - ${body.result[0].price} [${body.result[0].rarity.toUpperCase()}]`);
                  }
                  break;
              }
            } else {
              if (body.result == 1 && body.result) {
                if (body.result[0].rarity == "Mythical") {
                  if (body.result[0].price <= 30000) {
                    client.say(channel, `${body.result[0].name} (${body.result[0].type}) - ${body.result[0].price}`);
                    snipes++;
                  } else {
                    client.say(channel, `Last one: ${body.result[0].name} (${body.result[0].type}) - ${body.result[0].price}`);
                    snipes++;
                  }
                } else {
                  client.say(channel, `Last one: ${body.result[0].name} (${body.result[0].type}) - ${body.result[0].price}`);
                  snipes++;
                }
              }
            }
          }
          if(count==listcount&&snipes==0){
            let cooldown = await getCooldown(channel);
            client.say(channel,`There are no snipes on the market try again in ${cooldown} secs.`);
          }
        });
    }
  }
});
