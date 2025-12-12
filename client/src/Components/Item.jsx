import Col from "./Templates/Col";
import ActionBar from "./ActionButtons/ActionBar";

export default function Item({ data, refetch }) {
  return (
    <div className="py-2">
      {data.map((item) => {
        return (
          <div className="py-2 d-flex gap-2 align-items-center">
            <Col size={1}>{item.title}</Col>
            <Col size={1}>{item.quantity}</Col>
            <ActionBar table="Item" data={item} refetch={refetch} />
          </div>
        );
      })}
    </div>
  );
}
