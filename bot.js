const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');
const axios = require('axios');
const bodyParser = require('body-parser');
const { Buffer } = require('buffer');
require("dotenv").config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Replace 'YOUR_CHANNEL_ID' with the channel ID where notifications will be sent
const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.DISCORD_TOKEN; // Use environment variables for sensitive information
const BACKEND_URL = process.env.BACKEND_URL; // Replace with your backend URL

// Set to keep track of sent notifications by their ID
let sentNotifications = new Set();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Function to send a message to a specific channel
// Function to send a message to a specific channel
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

      // Attach the local image file
      const imageAttachment = new AttachmentBuilder('./kruba.jpeg', { name: 'kruba.jpeg' });

      // Add the attachment as the embed image
      embed.setImage('attachment://kruba.jpeg');

      // Send the embed with the image attachment
      await channel.send({ embeds: [embed], files: [imageAttachment] });
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


setInterval(pollNotifications, 10000);

// Log in to Discord
client.login(TOKEN);

// Set up a health check route for Vercel
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.use(bodyParser.json());

app.get('/identify', async (req, res) => {
    try {
        // Fetch the image from the provided URL
        const reqURL = 'https://media.discordapp.net/attachments/1171302901948371024/1312713856681775154/20241201_163547.jpg?ex=674d7f8c&is=674c2e0c&hm=7eae4063c937cf84209769b76aed0a93e5d30746cb1637c3cb69765e03946a5e&=&format=webp&width=496&height=662'
        // const reqURL = 'https://manatee-steady-immensely.ngrok-free.app/camera'
        const response = await axios.get(reqURL, { responseType: 'arraybuffer' });
        const imgBuffer = Buffer.from(response.data, 'binary');

        // Encode the fetched image to base64
        const encodedImage = imgBuffer.toString('base64');

        // Define the data payload
        const data = {
            images: [`data:image/jpg;base64,${encodedImage}`],  // Base64 encoded image
            similar_images: true  // Optional, whether to find similar images
        };

        const headers = {
            'Api-Key': process.env.API_KEY  // Replace with your actual PlantNet API key
        };

        // Send the POST request to PlantNet API
        const plantNetResponse = await axios.post('https://plant.id/api/v3/identification', data, { headers });
        
        console.log(plantNetResponse.status)
        // Handle the response
        if (plantNetResponse.status === 201) {
            res.json(plantNetResponse.data);
        } else {
            res.status(plantNetResponse.status).send(plantNetResponse.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

module.exports = app;
