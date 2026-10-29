import Head from 'expo-router/head';
import { Container, Page } from '@/components/ui/Page';
import { DayTimeline } from '@/components/today/DayTimeline';
import { Hero } from '@/components/today/Hero';
import { CrownMarquee, MidnightFooter, RulesShowcase, StandingsPreview, Wire } from '@/components/today/Sections';
import { copy } from '@/copy/en';

export default function Today() {
  return (
    <Page flush bottomPad={0}>
      <Head>
        <title>{copy.meta.title}</title>
        <meta name="description" content={copy.meta.description} />
      </Head>
      <Hero />
      <Container>
        <Wire />
      </Container>
      <DayTimeline />
      <StandingsPreview />
      <RulesShowcase />
      <CrownMarquee />
      <MidnightFooter />
    </Page>
  );
}
