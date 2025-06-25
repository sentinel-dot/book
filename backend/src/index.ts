import { createServer } from 'net';
import fs from 'fs';
import path from 'path';

const socketPath = '/var/run/backend/backend.sock';

// Remove the socket file if it already exists
if (fs.existsSync(socketPath)) {
  fs.unlinkSync(socketPath);
}

// Create the server
const server = createServer(async (socket) => {
  socket.on('data', async (data) => {
    try {
      const request = data.toString().trim();
      console.log(`Received request: ${request}`);

      // Extract the parameter from the request
      const [parameter] = request.split(' ');
      if (!['hand', 'einschr', 'einschr_einw'].includes(parameter)) {
        throw new Error('Invalid parameter');
      }
      let message = "";


      switch (parameter) {
        case 'hand':
          message = "shake";
          break;
        case 'einschr':
          break;
        case 'einschr_einw':
          break;
        default:
          throw new Error('Invalid parameter');
      }


      // Send the barcode image buffer to the client
      socket.write(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      socket.write(`Error: ${errorMessage}`);
    }
  });

  socket.on('end', () => {
    console.log('Client disconnected');
  });
});

// Start the server on the UNIX socket
server.listen(socketPath, () => {
  console.log(`Server running at ${socketPath}`);
});