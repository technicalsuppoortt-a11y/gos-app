import { useUILanguage } from '../i18n/display';
import React from 'react';
import { BuilderWorkspace } from './BuilderWorkspace';

/** Multi-page website editing workspace with page-level settings. */
export const WebsiteBuilderView: React.FC = () => { useUILanguage(); return (<BuilderWorkspace mode="website"/>); };

export default WebsiteBuilderView;
