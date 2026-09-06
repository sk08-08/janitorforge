import { CreatorPageBuilder } from "@/features/creator-pages/components/builder/creator-page-builder";

interface BuilderPageProps {
  params: Promise<{ id: string }>;
}

export default async function CreatorPageBuilderPage({
  params,
}: BuilderPageProps) {
  const { id } = await params;

  return <CreatorPageBuilder pageId={id} />;
}
