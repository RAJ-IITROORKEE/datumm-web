'use client';

import {AnswerContent,useOutputWorkspace} from './output-workspace';
import {useEffect,useState} from 'react';
import {answerCompletionCandidate,verifyAnswerCompletionHash} from '@/lib/conversation-turns.mjs';
import type {AnswerSource} from '@/lib/answer-outputs.mjs';
import {ChatCompositionView} from './chat-composition';

type Props = {text:string;source:AnswerSource;turnId?:string;presentation?:unknown;completed?:boolean;completion?:unknown};

function BoundAnswer({text,source,turnId,presentation,completion}:Props) {
 const {scope}=useOutputWorkspace();
 const [proof,setProof]=useState<{completion:unknown;text:string;taskId?:string;turnId?:string;key:string;epoch:number}|null>(null);
 useEffect(()=>{
  let current=true;
  const turn={turnId,answer:text,completion,index:0,endIndex:0};
  const candidate=answerCompletionCandidate({turn,turns:[turn],taskId:source.taskId ?? '',events:[]});
  void (candidate ? verifyAnswerCompletionHash(completion,text) : Promise.resolve(false)).then(ok=>{if(current)setProof(ok?{completion,text,taskId:source.taskId,turnId,key:scope.key,epoch:scope.epoch}:null);});
  return ()=>{current=false;};
 },[completion,text,source.taskId,turnId,scope.key,scope.epoch]);
 const valid=source.state!=='streaming' && scope.taskId===source.taskId && proof !== null && proof.completion===completion && proof.text===text && proof.taskId===source.taskId && proof.turnId===turnId && proof.key===scope.key && proof.epoch===scope.epoch;
 return <ConversationAnswer text={text} source={valid?{...source,state:'saved'}:source} turnId={turnId} presentation={presentation} completed={Boolean(valid)}/>;
}

export function ConversationAnswer({text, source, turnId, presentation, completed = false, completion}: Props) {
 if(completion!==undefined)return <BoundAnswer text={text} source={source} turnId={turnId} presentation={presentation} completion={completion}/>;
 const composition=completed&&presentation&&typeof presentation==='object'?'composition' in presentation?presentation.composition:undefined:undefined;
 const answer=<AnswerContent text={text} source={source} turnId={completed?turnId:undefined} presentation={completed?presentation:undefined}/>;
 return composition===undefined?answer:<ChatCompositionView value={composition} text={text} source={source} turnId={turnId}>{answer}</ChatCompositionView>;
}
