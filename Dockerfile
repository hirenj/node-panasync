FROM arm32v7/node:6

RUN apt-get update && apt-get install -y cifs-utils \
				   && apt-get clean \
				   && rm -rf /var/lib/apt/lists/

WORKDIR /panasync

COPY package*.json ./

RUN npm install --only=production

RUN mkdir /mnt/photos

COPY . .

CMD npm start