const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
require("dotenv").config();

// Initialize the Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.DISCORD_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;

// Maps to track sent notifications
let sentNotifications = new Set();
let motionLastTimestamp = null;
let lastMoistureNotification = null; // Tracks the last moisture-related notification

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Function to send a notification to a specific channel
const sendNotification = async (notification) => {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(notification.title)
        .setDescription(notification.message)
        .setFooter({ text: `Notification Type: ${notification.type}` });

      await channel.send({ embeds: [embed] });
      console.log(`Notification sent: ${notification.type}`);
    } else {
      console.error('Channel not found!');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Function to fetch notifications from the backend and send them to Discord
const pollNotifications = async () => {
  try {
    const response = await fetch(BACKEND_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    }
    const data = await response.json();

    if (data && data.notifications && data.notifications.length > 0) {
      data.notifications.forEach((notification) => {
        if (notification.type === 'motionDetected') {
          // Handle motionDetected notifications based on timestamp
          if (motionLastTimestamp !== notification.timestamp) {
            sendNotification(notification);
            motionLastTimestamp = notification.timestamp;
            console.log(`Motion detected notification sent at ${notification.timestamp}`);
          } else {
            console.log(`Motion detected notification skipped: duplicate timestamp ${notification.timestamp}`);
          }
        } else if (notification.type === 'moistureLow') {
          // Handle moistureLow notifications
          if (lastMoistureNotification !== 'moistureLow') {
            sendNotification(notification);
            lastMoistureNotification = 'moistureLow'; // Update the last moisture notification type
            console.log(`Moisture notification 'moistureLow' sent at ${notification.timestamp}`);
          } else {
            console.log(`Moisture notification 'moistureLow' skipped: already sent.`);
          }
        } else if (notification.type === 'moistureNormal') {
          lastMoistureNotification = 'moistureNormal';
          // Skip moistureNormal notifications entirely
          console.log(`Moisture notification 'moistureNormal' skipped.`);
        } else {
          // Handle other notifications
          if (!sentNotifications.has(notification.type)) {
            sendNotification(notification);
            sentNotifications.add(notification.type);
            console.log(`Notification of type '${notification.type}' sent at ${notification.timestamp}`);
          } else {
            console.log(`Notification of type '${notification.type}' skipped as it has been sent before.`);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
};

setInterval(pollNotifications, 10000);

// Log in to Discord
client.login(TOKEN);
