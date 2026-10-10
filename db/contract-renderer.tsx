import {renderToStaticMarkup} from 'react-dom/server';
import {ContractBody} from '@/components/contract-body';
import type {ComponentProps} from 'react';
export function renderContract(props:ComponentProps<typeof ContractBody>){
 return renderToStaticMarkup(<ContractBody {...props}/>);
}
