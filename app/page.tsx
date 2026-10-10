import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
export const dynamic='force-dynamic';
export default async function Home(){await headers();redirect('/operations');}
