

export class AdmiraltyWarnings {
    async connect() {
        return true;
    }

    async disconnect() {
        return true;
    }

    processMessage(messageLines, cb) {
        console.log('Processing message', messageLines);
        if (messageLines[0] === 'UK Coastal' ) {
            const id = messageLines[1].replace(/WZ /,'');
            cb(`cUA${id}`, messageLines.join('\r\n'));
        } else if (messageLines[0] === 'NAVAREA 1' ) {
            const id = messageLines[1].replace(/NAVAREA I /,'');
            cb(`1UA${id}`, messageLines.join('\r\n'));
        }
    }

    async sync(cb, text) {
        console.log('input ', text);

        let messageLines = [];
        text.split('\n').forEach((l) => {
            if (l === 'UK Coastal' || l === 'NAVAREA 1') {
                this.processMessage(messageLines, cb);
                messageLines = [l];
            } else {
                messageLines.push(l);
            }

        });

    }






}