import { useUILanguage } from '../i18n/display';
import React from 'react';
import { BuilderWorkspace } from './BuilderWorkspace';

/** Linear, step-based funnel editing workspace. */
export const FunnelBuilderView: React.FC = () => { useUILanguage(); return (<BuilderWorkspace mode="funnel"/>); };

export default FunnelBuilderView;
