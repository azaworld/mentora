import Link from "next/link";
import type { Expert, Workshop } from "@/db/schema";
import { Avatar, DateBlock, FORMAT_LABEL, ROLE_LABEL, Taka } from "./ui";

export function ExpertCard({ expert, featured, minPrice }: { expert: Expert; featured: boolean; minPrice: number | null }) {
  return (
    <article className="card">
      <div className="who">
        <Avatar name={expert.name} seed={expert.id} />
        <div style={{ minWidth: 0 }}>
          <h3>
            <Link href={`/experts/${expert.slug}`}>{expert.name}</Link>
          </h3>
          <small>
            {ROLE_LABEL[expert.role]} · {expert.yearsExperience} yrs · {expert.city}
          </small>
        </div>
      </div>
      <div className="tags">
        {featured ? <span className="tag gold">Featured</span> : null}
        {expert.plan !== "STARTER" ? <span className="tag ok">Verified</span> : null}
        {expert.isSample ? <span className="tag sample">Sample</span> : null}
      </div>
      <div className="tags">
        {expert.topics.slice(0, 4).map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
      <div className="meta">
        <span>{expert.reviewCount ? `★ ${expert.rating.toFixed(1)} (${expert.reviewCount})` : "New"}</span>
        {minPrice ? (
          <b>
            From <Taka minor={minPrice} />
          </b>
        ) : null}
      </div>
      <div className="btns">
        <Link className="btn btn-ghost btn-sm" href={`/experts/${expert.slug}`}>
          View profile
        </Link>
      </div>
    </article>
  );
}

export function WorkshopRow({ workshop, expert }: { workshop: Workshop; expert: { name: string; slug: string } }) {
  const left = workshop.seats - workshop.seatsSold;
  return (
    <article className="ws">
      <DateBlock date={workshop.startsAt} />
      <div style={{ minWidth: 0 }}>
        <h3>
          <Link href={`/workshops/${workshop.id}`}>{workshop.title}</Link>
        </h3>
        <div className="small muted">
          {expert.name} · {FORMAT_LABEL[workshop.format]} · {workshop.duration}
        </div>
        {left <= 0 ? <div className="low">Sold out</div> : left < 10 ? <div className="low">Only {left} seats left</div> : <div className="small muted">{left} seats available</div>}
      </div>
      <div className="act" style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "flex-end" }}>
        <div className="price">
          <Taka minor={workshop.priceMinor} />
          <small>per seat</small>
        </div>
        <Link className="btn btn-gold btn-sm" href={`/workshops/${workshop.id}`}>
          {left <= 0 ? "Details" : "Register"}
        </Link>
      </div>
    </article>
  );
}
