import CrewMessages from "../messages/CrewMessages";
import ProducerGuard from "./ProducerGuard";

function ProducerMessages() {
  return (
    <ProducerGuard>
      <CrewMessages mode="PRODUCER" />
    </ProducerGuard>
  );
}

export default ProducerMessages;
