'use client';
import { Dispatch, SetStateAction } from 'react'


interface Props{
    onClose: Dispatch<SetStateAction<boolean>>
    nextAction: NextActionType[]
    setNextAction: Dispatch<SetStateAction<NextActionType[]>>
}
export default function CustomFollowUpActions({onClose,nextAction,setNextAction}: Props) {
  return (
    <div>CustomFollowUpActions</div>
  )
}
