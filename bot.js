const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Replace 'YOUR_CHANNEL_ID' with the channel ID where notifications will be sent
const CHANNEL_ID = '1303061838354976849';
const TOKEN = 'ODk2Njg5MjE1NzkyODgxNzQ1.GFN48X.AfynBwSX7rlLsMTO0yz_Yno37l_YvmEHr24GHs'; // Use environment variables for sensitive information
const BACKEND_URL = 'https://water-visuals-backend.vercel.app/api/notifications'; // Replace with your backend URL

// Set to keep track of sent notifications by their ID
let sentNotifications = new Set();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Function to send a message to a specific channel
const sendNotification = async (notification) => {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(notification.title)
        .setDescription(notification.message)
        .setFooter({ text: `Notification Type: ${notification.type}` })
        .setTimestamp(new Date(notification.timestamp));

      await channel.send({ embeds: [embed] });
      console.log('Notification sent successfully.');
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
        if (!sentNotifications.has(notification.type)) {
          sendNotification(notification);
          sentNotifications.add(notification.type);
        }
      });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
};


setInterval(pollNotifications, 1000);

// Log in to Discord
client.login(TOKEN);

// Set up a health check route for Vercel
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

module.exports = app;
