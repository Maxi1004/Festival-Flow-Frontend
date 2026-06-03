import CrewMessages from "../messages/CrewMessages";
import ProducerGuard from "./ProducerGuard";

function ProducerMessages() {
  return (
    <ProducerGuard>
      <CrewMessages />
    </ProducerGuard>
  );
}

export default ProducerMessages;
