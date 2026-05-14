import { Recommendation } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

export function RecommendationBadge({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation === "Strong Shortlist") {
    return <Badge variant="success">{recommendation}</Badge>;
  }
  if (recommendation === "Shortlist") {
    return <Badge variant="info">{recommendation}</Badge>;
  }
  if (recommendation === "Review Manually") {
    return <Badge variant="warning">{recommendation}</Badge>;
  }
  return <Badge variant="danger">{recommendation}</Badge>;
}
