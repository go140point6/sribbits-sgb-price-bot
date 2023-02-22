require('dotenv').config() // Load .env file
require('log-timestamp')
const ethers = require('ethers')
const { Client, Intents } = require('discord.js')

const myIntents = new Intents();
myIntents.add(Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MEMBERS)

// Create a new client instance
const client = new Client({ intents: myIntents })

const up = "\u2B08"
const down = "\u2B0A"
const mid = "\u22EF"

var guild
var lastPrice
var currentPrice
var arrow
var red
var green
var member

var sgbPrice

var provider = new ethers.providers.JsonRpcProvider(
  "https://sgb.ftso.com.au/ext/bc/C/rpc"
)

const ftsoRegistry = {
  address: "0x6D222fb4544ba230d4b90BA1BfC0A01A94E6cB23",
  abi: [
    {
      type: "function",
      stateMutability: "view",
      outputs: [
        { type: "uint256", name: "_price", internalType: "uint256" },
        { type: "uint256", name: "_timestamp", internalType: "uint256" },
      ],
      name: "getCurrentPrice",
      inputs: [{ type: "string", name: "_symbol", internalType: "string" }],
    },
    {
      type: "function",
      stateMutability: "view",
      outputs: [
        { type: "uint256", name: "_price", internalType: "uint256" },
        { type: "uint256", name: "_timestamp", internalType: "uint256" },
      ],
      name: "getCurrentPrice",
      inputs: [
        { type: "uint256", name: "_assetIndex", internalType: "uint256" },
      ],
    },
  ],
}

// Create FTSO Registry contract instance
const ftsoRegistryContract = new ethers.Contract(
  ftsoRegistry.address,
  ftsoRegistry.abi,
  provider
)

//console.log(ftsoRegistryContract)
  
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getStuff() {
  guild = await client.guilds.cache.get(`${process.env.SERVER_ID}`)
  //console.log(guild)
  member = await guild.members.cache.get(`${process.env.BOT_ID}`)
  //console.log(member)
  red = await guild.roles.cache.find(role => role.name === 'tickers-red')
  //console.log(red)
  green = await guild.roles.cache.find(role => role.name === 'tickers-green')
  //console.log(green)
}

async function clearRoles() {
  await getStuff()
  await member.roles.remove(red)
  await member.roles.remove(green)
}

async function setRed() {
  console.log('Setting Red Role Now...')
  await getStuff()
  await clearRoles()
  await member.roles.add(red)
  let redRole = await member.roles.cache.some(role => role.name === ('tickers-red'))
  console.log ('Attempted adding of redRole, if successful, this should be true:', redRole)
  if (!redRole) {
     console.log ('ERROR, still showing false for redRole... trying again...')
     await (member.roles.add(red))
     let redRole = await member.roles.cache.some(role => role.name === ('tickers-red'))
     console.log ('Attempted 2nd adding of redRole, if successful, this should be true:', redRole)
  }
}

async function setGreen() {
  console.log('Setting Green Role Now...')
  await getStuff()
  await clearRoles()
  await member.roles.add(green)
  let greenRole = await member.roles.cache.some(role => role.name === ('tickers-green'))
  console.log ('Attempted adding of greenRole, if successful, this should be true:', greenRole)
  if (!greenRole) {
     console.log ('ERROR, still showing false for greenRole... trying again...')
     await (member.roles.add(green))
     let greenRole = await member.roles.cache.some(role => role.name === ('tickers-green'))
     console.log ('Attempted 2nd adding of greenRole, if successful, this should be true:', greenRole)
  }
}

async function getInitialPrice() {
  let sgbBN = await ftsoRegistryContract["getCurrentPrice(string)"]("SGB")
  let sgb = Number(sgbBN._price) / 10 ** 5;
  console.log(sgb);
  sgbPrice = sgb;

  let ftso = {
    // OracleSwap
    //address: "0x73E93D9657E6f32203f900fe1BD81179a5bf6Ce4",
    // Pangolin
    address: "0x6591cf4E1CfDDEcB4Aa5946c033596635Ba6FB0F",
    abi: [
      {
              "inputs": [
                      {
                              "internalType": "uint256",
                              "name": "amountIn",
                              "type": "uint256"
                      },
                      {
                              "internalType": "address[]",
                              "name": "path",
                              "type": "address[]"
                      }
              ],
              "name": "getAmountsOut",
              "outputs": [
                      {
                              "internalType": "uint256[]",
                              "name": "amounts",
                              "type": "uint256[]"
                      }
              ],
              "stateMutability": "view",
              "type": "function"
      }
    ],
  };

  const ftsoContract = new ethers.Contract(ftso.address, ftso.abi, provider)

  //console.log(ftsoContract)

  const WSB_ADDRESS = "0x02f0826ef6ad107cfc861152b32b52fd11bab9ed"
  const wsb = "wsb"
  const SPRK_ADDRESS = "0xfd2a0fD402828fDB86F9a9D5a760242AD7526cC0"
  const sprk = "sprk"

  //let sgbBN = await ftsoRegistryContract["getCurrentPrice(string)"]("SGB")
  //let sgb = Number(sgbBN._price) / 10 ** 5;
  console.log(sgbPrice);

  let arryPrice = await ftsoContract.getAmountsOut(
      ethers.utils.parseEther("1"),
      [WSB_ADDRESS, SPRK_ADDRESS]
  )

  //console.log(arryPrice[0])
  //console.log(arryPrice[1])

  let wsbSGBPrice = Number(arryPrice[0]._hex) / 10 ** 18
  let sprkSGBPrice = (Number(arryPrice[1]._hex) / 10 ** 18).toFixed(5)
  let wsbUSDPrice = (sgbPrice / wsbSGBPrice).toFixed(5)
  let sprkUSDPrice = (sgbPrice / sprkSGBPrice).toFixed(5)
  console.log(wsb + " USD price is " + wsbUSDPrice)
  console.log(sprk + " USD price is " + sprkUSDPrice)

  clearRoles()
  lastPrice = sprkUSDPrice || 0
  let symbol = `${process.env.COIN_ID.toUpperCase()}`
  client.user.setPresence({
    activities: [{
    name: `SGB=${sprkSGBPrice} ${symbol}`,
    type: `PLAYING`
    }]
  })

  arrow = mid
  client.guilds.cache.find(guild => guild.id === process.env.SERVER_ID).me.setNickname(`${symbol} ${arrow} ${process.env.CURRENCY_SYMBOL}${sprkUSDPrice}`)
  
  console.log('Initial price to', lastPrice)
  //console.log(`SGB: ${sgbPrice} per ${symbol}`)
}
 
async function getPrices() {
  let sgbBN = await ftsoRegistryContract["getCurrentPrice(string)"]("SGB")
  let sgb = Number(sgbBN._price) / 10 ** 5;
  console.log(sgb);
  sgbPrice = sgb;

  let ftso = {
    // OracleSwap
    //address: "0x73E93D9657E6f32203f900fe1BD81179a5bf6Ce4",
    // Pangolin
    address: "0x6591cf4E1CfDDEcB4Aa5946c033596635Ba6FB0F",
    abi: [
      {
              "inputs": [
                      {
                              "internalType": "uint256",
                              "name": "amountIn",
                              "type": "uint256"
                      },
                      {
                              "internalType": "address[]",
                              "name": "path",
                              "type": "address[]"
                      }
              ],
              "name": "getAmountsOut",
              "outputs": [
                      {
                              "internalType": "uint256[]",
                              "name": "amounts",
                              "type": "uint256[]"
                      }
              ],
              "stateMutability": "view",
              "type": "function"
      }
    ],
  };

  const ftsoContract = new ethers.Contract(ftso.address, ftso.abi, provider)

  //console.log(ftsoContract)

  const WSB_ADDRESS = "0x02f0826ef6ad107cfc861152b32b52fd11bab9ed"
  const wsb = "wsb"
  const SPRK_ADDRESS = "0xfd2a0fD402828fDB86F9a9D5a760242AD7526cC0"
  const sprk = "sprk"

  //let sgbBN = await ftsoRegistryContract["getCurrentPrice(string)"]("SGB")
  //let sgb = Number(sgbBN._price) / 10 ** 5;
  console.log(sgbPrice);

  let arryPrice = await ftsoContract.getAmountsOut(
      ethers.utils.parseEther("1"),
      [WSB_ADDRESS, SPRK_ADDRESS]
  )

  //console.log(arryPrice[0])
  //console.log(arryPrice[1])

  let wsbSGBPrice = Number(arryPrice[0]._hex) / 10 ** 18
  let sprkSGBPrice = (Number(arryPrice[1]._hex) / 10 ** 18).toFixed(5)
  let wsbUSDPrice = (sgbPrice / wsbSGBPrice).toFixed(5)
  let sprkUSDPrice = (sgbPrice / sprkSGBPrice).toFixed(5)
  console.log(wsb + " USD price is " + wsbUSDPrice)
  console.log(sprk + " USD price is " + sprkUSDPrice)

  currentPrice = sprkUSDPrice || 0
  let symbol = `${process.env.COIN_ID.toUpperCase()}`
  client.user.setPresence({
    activities: [{
    //name: `SGB: ${sgbPrice} per ${symbol}`,
    name: `SGB=${sprkSGBPrice} ${symbol}`,
    type: `PLAYING`
    }]
  })

  console.log('The lastPrice:', lastPrice)
  console.log('The currentPrice:', currentPrice)
  if (currentPrice > lastPrice) {
    console.log('up')
    arrow = up
    setGreen()
    } else if (currentPrice < lastPrice) {
      console.log('down')
      arrow = down
      setRed()
      } else {
        console.log('same')
      }

  client.guilds.cache.find(guild => guild.id === process.env.SERVER_ID).me.setNickname(`${symbol} ${arrow} ${process.env.CURRENCY_SYMBOL}${sprkUSDPrice}`)

  //console.log('Current price to', currentPrice)
  //console.log(`SGB: ${sgbPrice} per ${symbol}`)

  lastPrice = currentPrice
}

// Runs when client connects to Discord.
client.on('ready', () => {
  console.log('Logged in as', client.user.tag)
  getInitialPrice() // Ping server once on startup
  // Ping the server and set the new status message every x minutes. (Minimum of 1 minute)
  setInterval(getPrices, Math.max(1, process.env.UPDATE_FREQUENCY || 1) * 60 * 1000)
})

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);