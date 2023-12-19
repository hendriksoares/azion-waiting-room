import { WaitingRoomService } from 'src/waiting-room.service';

async function main(event: any) {
  event.args = {
    token: '',
    url: '',
  };

  const service = new WaitingRoomService(event);

  return await service.run(event);
}

export default main;
