import { notFound } from "next/navigation";
import { PresenterView } from "@/components/PresenterView";
import { getEvent } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PresentPage(props: PageProps<"/events/[id]/present">) {
  const { id } = await props.params;
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  return <PresenterView initialEvent={event} />;
}
