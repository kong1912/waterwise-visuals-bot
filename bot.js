const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
require("dotenv").config();

// Initialize the Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Replace 'YOUR_CHANNEL_ID' with the channel ID where notifications will be sent
const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.DISCORD_TOKEN; // Use environment variables for sensitive information
const BACKEND_URL = process.env.BACKEND_URL; // Replace with your backend URL

// Maps to track sent notifications
let sentNotifications = new Set();
let motionLastTimestamp = null;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Function to send a notification to a specific channel
const sendNotification = async (notification) => {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      // Create an embed for the notification
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(notification.title)
        .setDescription(notification.message)
        .setFooter({ text: `Notification Type: ${notification.type}` });

      // Send the embed
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
        } else {
          // Handle other notifications based on type
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

