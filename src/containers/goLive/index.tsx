import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useFormContext} from 'react-hook-form';
import {Breadcrumb} from '@aragon/ods-old';
import {PushAPI} from '@pushprotocol/restapi';
import {JsonRpcSigner} from '@ethersproject/providers';
import {Button, AlertCard, IconType} from '@aragon/ods';
import {useNavigate} from 'react-router-dom';

import Blockchain from './blockchain';
import DaoMetadata from './daoMetadata';
import Community from './community';
import Governance from './governance';
import DaoPushGroup from './daoPushGroup';
import goLive from 'assets/images/goLive.svg';
import {Landing} from 'utils/paths';
import {useWallet} from 'hooks/useWallet';
import {useGlobalModalContext} from 'context/globalModals';
import {trackEvent} from 'services/analytics';
import Committee from './committee';
import {CreateDaoDialog} from 'containers/createDaoDialog';
import {convertToBase64} from 'utils/imageConverter';

export const GoLiveHeader: React.FC = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const clickHandler = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-neutral-0 px-4 pb-6 pt-4 md:rounded-xl md:p-6 xl:p-12 xl:pt-6">
      <div className="xl:hidden">
        <Breadcrumb
          crumbs={{label: t('createDAO.title'), path: Landing}}
          onClick={clickHandler}
        />
      </div>
      <div className="flex justify-between">
        <div className="w-full pt-6">
          <h1 className="text-4xl font-semibold leading-tight text-neutral-800">
            {t('createDAO.review.title')}
          </h1>
          <p className="mt-4 text-xl leading-normal text-neutral-600">
            {t('createDAO.review.description')}
          </p>
        </div>
        <img className="hidden w-[200px] md:block" src={goLive} />
      </div>
    </div>
  );
};

const GoLive: React.FC = () => {
  const {t} = useTranslation();
  const {getValues} = useFormContext();

  const {votingType} = getValues();

  return (
    <div className="space-y-10 md:mx-auto md:w-3/4">
      <Blockchain />
      <DaoMetadata />
      <Community />
      <Governance />
      <DaoPushGroup />
      {votingType === 'gasless' && <Committee />}
      <AlertCard message={t('createDAO.review.daoUpdates')} variant="info" />
    </div>
  );
};

const createPushChannel = async (
  signer: JsonRpcSigner,
  title: string,
  description: string,
  image: File
) => {
  const connectedSigner = await PushAPI.initialize(signer, {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    env: import.meta.env.VITE_PUSH_ENV,
  });

  if (!connectedSigner) {
    console.log('Error connecting to Push API');
    return;
  }
  console.log('VITE_PUSH_ENV', import.meta.env.VITE_PUSH_ENV);
  console.log('image', image);
  const imageBase64 = await convertToBase64(image);
  console.log('imageBase64', imageBase64);
  const response = await connectedSigner.chat.group.create(title, {
    description: description,
    image: imageBase64 || '',
    private: false,
  });

  if (!response) {
    console.log('Error creating channel');
    return;
  }

  console.log('Channel created', response);
};

export const GoLiveFooter: React.FC = () => {
  const {watch, setValue, getValues} = useFormContext();
  const {reviewCheck} = watch();
  const {t} = useTranslation();
  const {open} = useGlobalModalContext();
  const {isConnected, provider, isOnWrongNetwork, signer} = useWallet();
  const {daoName, daoSummary, daoLogo} = getValues();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isButtonDisabled = !Object.values(reviewCheck).every(v => v === true);

  const publishDao = (e: React.MouseEvent) => {
    e.stopPropagation();
    isConnected &&
      trackEvent('daoCreation_publishYourDAO_clicked', {
        network: getValues('blockchain')?.network,
        wallet_provider: provider?.connection.url,
        governance_type: getValues('membership'),
      });

    if (isConnected && signer) {
      if (isOnWrongNetwork) {
        open('network');
      } else {
        setIsDialogOpen(true);
        createPushChannel(signer, daoName, daoSummary, daoLogo);
      }
    } else {
      open('wallet');
    }
  };

  const showInvalidFields = () => {
    if (isButtonDisabled) {
      setValue('reviewCheckError', true);
    }
  };

  return (
    <div className="flex justify-center pt-6">
      <div onClick={showInvalidFields}>
        <Button
          size="lg"
          variant="primary"
          iconRight={IconType.CHEVRON_RIGHT}
          onClick={publishDao}
          disabled={isButtonDisabled}
        >
          {t('createDAO.review.title')}
        </Button>
        <CreateDaoDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      </div>
    </div>
  );
};

export default GoLive;
