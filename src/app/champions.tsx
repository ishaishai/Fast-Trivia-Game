import { Redirect } from 'expo-router';

/** The Hall of Crowns now lives in Ranks › Winners; old links still land there. */
export default function ChampionsRedirect() {
  return <Redirect href="/standings?view=winners" />;
}
