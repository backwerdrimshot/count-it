import type {Metadata} from 'next';
import CountItApp from '../CountItApp';
export const metadata:Metadata={title:'Archived original round | Count It',robots:{index:false,follow:false}};
export default function ArchivePage(){return <CountItApp archiveOriginal />;}
