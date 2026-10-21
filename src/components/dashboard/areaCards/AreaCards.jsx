import { BASE_CURRENCY } from "../../../constants/currency";
import AreaCard from "./AreaCard";
import "./AreaCards.scss";

const AreaCards = () => {
  return (
    <section className="content-area-cards">
      <AreaCard
        colors={["#e4e8ef", "#f29a2e"]}
        percentFillValue={80}
        cardInfo={{
          title: "MTD Revenue",
          value: `${BASE_CURRENCY}20.4K`,
          text: `Gross MTD Revenue is :${BASE_CURRENCY}20.4K`,
        }}
      />
      <AreaCard
        colors={["#e4e8ef", "#f29a2e"]}
        percentFillValue={50}
        cardInfo={{
          title: "Today's Revenue",
          value: `${BASE_CURRENCY}8.2K`,
          text: "",
        }}
      />
    </section>
  );
};

export default AreaCards;
