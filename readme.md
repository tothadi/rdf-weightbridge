# RDF Weightbridge

In this repo you can find a small project for displaying data emitted by a weightbridge at the entrance of 3B Hungária RDF Facility in Zalaegerszeg. The purpose of this small program is to show real-time weight data of incoming and outgoing garbage trucks and to store the weights with timestamp.
Two kiosks were planted at the entrance of the facility to let the drivers register their inbound and outbound weights for automatic data handling. The program running on these kiosk made by a 3rd party company is not foolproof enough which leads to a lot of manual data handling. Another problem with the system is the claim of the facility manager to see the real-time weights in the control room.

### Technical background
The weightbridge communicates through RS232 with an ATC-1000 RS232/LAN converter. As the program running on the kiosks also communicates with the weightbridge and has a higher priority I had to find a way to reserve the connection for short periods. In scale.js my server-app connects for 1 sec to collect weight data from the TCP stream than the connection is closed for 1 sec to allow the kiosks connect to the weightbridge.
In app.js the server emits the weight to the client utilizing socket.io so the data is displayed in the browser. If this data is not 0 (there's a truck on the weightbridge) then the weight values are collected in an array until the truck leaves the wightbridge. When the weight is 0 again the mode of the collected values is saved to a database with a timestamp. Meanwhile the current daily weigths are fetched from the dbase and are emitted to the client with socket.io and displayed in the browser in a table with the timestamps.
The table can be switched from the current daily weights to weights of a date given by the user.

#### Built with
Angular, Node, Express, MongoDb, html, css, javascript, jquery, socket.io, net.socket, visual studio code, Angular CLI, Npm

#### Link
Running [app]
My [introduction] page

   [app]: <http://kozpont.zkn.hu>
   [introduction]: <https://www.tothadi.hu>

