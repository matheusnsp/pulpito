#!/usr/bin/env python3
# coding: utf-8
"""Instalador offline de colaboração para github.com/matheusnsp/pulpito.
Uso: python3 instalar_compartilhamento.py [--dry-run]
Não executa SQL remoto nem escreve no GitHub.
"""
from __future__ import annotations
import argparse
import base64
from datetime import datetime
from pathlib import Path
import json
import shutil
import subprocess
import sys
import zlib

PAYLOAD = """c-q~4+io03mf)|1-JYo`byiZOF74(`!=~vTVP#1pN`8^GWK?F5Oe=5B3n`i|pn(Nuu-KP<*vDO9Jp=5*4K((lcd@`cF8{<|vge$*WJF%7ij?g3v|)%<l^G`@&i$M?5pnhLi-Wz-zBrifKYOzGyJs)<_V=FoN%-+5`}kMv`SriXc~oWW$3OfR7Gz1ziz<rGcp_5xF%&E>vadyzm0zV_r3Yoj8Lw&{N8j@6|9Sl{8RKCTL|MwAZOms`p?=P@g59~J+TOXt#)UYI%BskiNZ2s|FZn6_bL?TCtQ2+0s_Q@JQIM5PuriK9QBHjJ6k%DTVpSHx2;ir*;vUO645)-5M&~@_rN<B`ypYvw7R}-)t3<$k9Qm()#U7{daxBM(Kdt-hbNI$tov;}X-qtw_p|k5hhtVkv6Ti%O8W0jf9%dx~+JGT(R`BRsd|Ze;D<c?p5oI1LGI;SgzpT!(^d5_3Z^cm?r+$8U43O^mfS+fxB0A*~z$Rcxyc0oP0hF@N`HYuhEs0JGUIBv3wT-(Q57+O)zZ>`O-o4v}TYeKCvor&+hyU<|9fUyC0${>80lk`x>`*~wV?a_}T79u_#`3y6JBIfG#rsblv#+neXQHg4b5XGKC=KeEBl<G~4M<f30cezf*#9F+{XUQx{?Cd~BtXY!tPF}Muh?@!4@+vKQptGnO&y)Xhd2v(1O!X~T8czZvM@S{0(eVN0U%}-&LshY5eJBOk~`9q=(H|iWPsNDK6^oQNb`ghb;@RS6o<fOCq!yMS`t+-?7Rl{_@)*Bp659<eBiT}Fmyru7~-Ue$4V9g+eY|l6Ms36;1z%$i>QJ=J^MEiM#Nkm&@qpcBmiHC^XycK1t2yMWeGeL6^K6+lUFaE5R2ZqvsZ~!Nfo?W!th|Cu{Z_hL+&ulIX!`)!O($uqLjxHVO7Du1+r;Uz%MvGz&g;`5xC<jBRM-}NPLpCW1sEWErGlN%#H*tu0gn8y?Xo^auPfMVH4H$_W+kfxdsM+&qom=8NP`^eGIcSvp(YA>>@RfVPG(=BR~Lt<25iVK0(nv*1c%JK06e0k|IT_6ubZ&#~kDzNdUt*7vCZUcvVC|@WLo9cKzR3jtJ*W6vQIzaR|}^tcBPy^D6|PQ79$>=Ht0g8W02u#fbyLOX?zzfh!BGRQ9tZ12N(SexI_Z&{m{1`|&^hFMJspRiQqCF@b`ES>qG|svrS{(U&j=&}?_^>^Bl^W^m_@k8nQ|CqQX<2gRDBSOX9c^b7|nKsHOMli^7NaeeIpC=D1L>C{t@NmO-;VF~O3d_)n5qx9_-f)wfptpyRm$VY%-9wArK>~N?Aq?GzaO3)N|D64@u2IEL6k|$2KKuw?I3Y8to0?dYG&X}GtWEXaR{YOUF2%?;j?*WH{k^taE5|t(D8jsE53`Q66H6Y+DiV>O=Fr2XzJPo{5&^tEn`Uet2g>aue5l9%Ib|C^WQ|hKdb_;=K0cyZT0c<Hc!t1~V3F<WSgLnt31L;$0ZaEaFs8VDyfDnNyQd(1TkH#wKp8{b02DAhkwGufW$cHwF@mO#GA8|=}Kw^>bZ$&B}=I{YE7ck`+FVEQF-|tN~9z2xPDQ(<IsGz7x%Z8|SwWgJ}`$cvEs5lofj2e_dR9&JOfAQpSBDrFzP62BiU;mJh9hGFt6r*BSnrB`mhF|1ch~HGY5FygA22vqsTfB?X2;8|vd|N6y<NT?e<f;TZIY-}sV3$67&WRZd5Ff3CkriT4GlWVH=B&nvib1wRHucaRrUILg+QS#AOH{9#Vmv~>11vQdGbOX+ETIg50*59vHn5>_9WlUXNi4z<CFdFPHmA`7>I0tS@Jj+>9FyWetrJ(mSlBX3>bSc8=Ttxo5ZW_fGjt)Os{$k?0>dcSXLW-C!e>I<2^c_0E)!$OrQwxtl-Uf17QhsRL^_TKageEDpl#<GKqcTQ7+sJ*G8p;w_h^(Pk4OnB+~JcU=TaPB2;c}9PATyHP%$+PCBFU>2tRxzVslcy$0e{n-~>4ih6mDHO6w8x@`z_gh)ZHYm;ktD&<i@4yu{&ujbe*`LQRGOG-Zj>CV408s0JTtC|Cl@u#WLDAcoYJxc*mw5;}emF}*LvSRxi)lScntg=R_`7haQk06iGG(`>W_&J^Sfy%cb4BM_p~D5GC1J_9{eYHNh_&g1Nok#)(!n)-t=eC)B0%OY5dquE+#QdNnbe*|PJDt5(;`!{DN1?cLLzovg0p;`i824Ac$a{)4xi}<;k^9~!KrXI2H*huO;`WOrSF|Fgc)n4i!o+(X-FuG0MHv1~B2thP<V7!gPvB@Byh|<$7{af=xt~=W7^tom93_P4=8R*k=%Y-rDl88jZVe|G-^r)|x-TlJeq%UYe-6D&;3Ft{cHnu?W-W|EWXoY4EMWVAkqUZ2x#O-laV3y+Swqry1rUzbLrU5&t(*Oeykm!c^<7WC301SK+m15gwk6m{4RmxCWO60PTW4s1F7*KHz1LYSS{BX@^evt>`QC?FddPE%^DbX5v&^kZTUKEi%3fX*u(4!MJCYTdeofTlP=nFmp@47BhHpYJ0qeq0i2`UzQj9;Y-ri%`0p)h4l*IR^9&mryP_9&pvkCb&m6d)kh#RH7y$QqCNh`%>{h5zC&XCOxKb^YO|9>QCOLpkukFqcFo;P485ME9`avK~fy{YLTZ<dOgS?i=0JM+%<qEfp8+0DBydo{IF$GV&)`q`aQd#3HGBypVP|881ydcd$0UI?^LY`#yY2z1ma*oa@fz-<A2+;My5u3#Sv!*$a^&{h{U9kUzY~{8dNqhXCRc?6rqM_El68rRUe*gT2itWFgjTF^R^WoYO+|#9($2JI2b0vR}Jdue^Tq9%zys9tC!fA4to+enUFW8R<%smtO49ycO?#h&juSKJ;|e02hma^j$67I9k2sLM&19T^FLI>{pZ+IVPJImMDAM`%#}4*#LW-`r`_^e*qe$Z_;ZR6?GpsOmrKZs190Mqz4u11^UHweS?WvLXf^4(2jBfitmm;xw?QbFT3zDTZv75nSz_Iss7hKxxx%pC|<pIjM<zl1&>?7oXn4@f9;zG`gysg+>zh&N`QC%&T-En4uhZfG3a<#A)7j%4^B=*AU_^f966KRLWstK>M6$0+Nm$_7x1hN+$S(;YKL)gQo1iri>wCDoQ7Fqx3N7yuO}if5rp3xc{HG&$mEG`XIkYz;&RP>N<oNZAvN=iIt4azaN~NPW3rNl*0Md#7GB!J6%2G}CTwTdLh0D)V1ga5-C?g1CIb^NwQ0avg83_^6L`RlNiISe7Z#ujN|w}>4A3Bwtsz9^=a|_7iN>HVwNmicKS01d<3%B&LgpYn8Jd>SxdO;p0NA7a45f@QlW}Lw%qtWp5d2!aY_ZZ9nCC2t!$PENzR8+zn>K&6WE8Y8#AG9qQo|hMN%P8UVgk&GRD`8B@<rl4hXfeV1vs};4l*;^9oye*fGC;-53RfnZaf+h4OqkJV@WclA!AX=lnXSfidx8DC0L!=Dh!=fBgW1%m}M)PnfTS2NXO$`zDf#&Ku<74R&#}?TY8{4IKYxrH}XFpltOT(hd2O&_|k$xD_rR6=2=-@{|WPL&CpAkzcEQWA4T9KqC|_8t`8fY@|{u5<sZ{|hXkzYY&@~i_f3s2eHkGqHliXY6=p$=0_~r}W6HW-61~{Y4)6~B7z-GO1zL|p=}#Vp2bjKjLMaacuH6a1M7O}SQKK<^b(=K3gNUT3XepdgD+t<YP!rJna>C;hB49Nj%t@V#rDNJ^#?#wk>5wEI<{o<;g>MvdBT93r(GY(&iS*#Na~8zBET4iR-TCU{eEKOvJvAj|HQo5?<6Yzn7-ot-u}*I`>vTW<;eTwe<-5kertTW(VRY`mPu@*Yabad+dNGYpS(yXK>E-kugRY@BiP`P5b*CAwN=?J4%wv8j$M-H~^dn`!W?39U+dVlr7%IG(rNr{vYiH{ks5?~xQzq@{UZK)p-+_wJ+QwNPl97QHoPWu5Muq#MxkdzZg*K2?8FaHoYZb**;p?l9ok7g9if7YO1a%ss#{~m;39)KsrKGpl5Eud8UITpY_E1)(w;H^+%;4It<!o#_w#bKf&Z7{QVR>AOoht%6-@Vd09j4XaVApXv`V4Hx<>>J%KCB<{yDWSAEElQA4lcoEfe^O@{F6sz+Q)SO!=HBg>!vHEvti{d&Aa5Ge4#u?<**!Lo>qN+NsAU9+u!@*`Ln~Lm(QL*-hb8xTt%Rn8>rO&OSz0;-m`o;>$#mi?HFp82ICu>;lxY}w7Z_8V~q8WI(7IR1NOyrL=o<e%|{!iTEroc5;vs-QT_&j;P~|$yPeE^Q!|>r+lqebHu}(JUxlkakK^%cZIn%jfutIb%#zh;;+G;u$fG;(S$s1dMImTwbOaK9ITMHA{l{WF@dh9%RQ15IA{7M?iy*)_P%Xr05TZol?E${gF3f9Wb-?T!*Xtq0uly0IW9%o1FQYS1sa5l_^i>eG$X!tetH3G`WqD}n4g{Z-Q79`nKo@2H$T&+D&yJyQovzWpnZ%aeKyl=FT$%SZLrzpSz<OIU;&@z|mlYqn@6IQ~UYnWp=Ny;QrH@ZVC*)<V;9m@xds7pDcA*i)VRMfb-uMMWRy{G;8#3$?(ssV9O^#!QeS~Hk#U*BtCDrsE!22?bD_$rIsI8x!uTkc9v77M#oCWP?JY@O1>3x>ZrW>EKyaIP82{+-V#`ov}cM^+t4F8#46g+2Ol#_BA;EGzozOKtEI=P(AM0Ft`9y;YY4ZU&R7tCAxAmqxR7o)rptO{ah-~|?&NW&rqA_B}G|M5Sw$AHlw$}F!y^#U_Y9pF)l&89SXXUI6j4F(1jK!?*4)ZnwzX;v3Nf*L|fL=pI7m(z9sf%3M>-XS8z!Ons#ehZGn`hz(*8cbJ?s4|A_H5^!jTjRoLOxtsCxwFV{!HHZ@6Yht!mI{GZaQ(-|-|F)jfrU0$*Kxep=Q&<!2KVJ6m*f9oU08MfC;T0KJmXK|e^x_ukdDZI_}jm2&qR)8fDkPQbX)r{8m+$}wD$Ex9_M@zf6(hX8*+0kaNuDaB~gkAg*j6n*#G;#c9-C(NKaFgRSoe2d&EWu>f<J$ipTuC;I<3wVkZ<8XgX0o^0OHr6%|=8mhS2CIz!a0O=EZBE>B4ZUP8yL2>|A?D5^fu13x}G&9v9wf(q&g{V9jVHrxTvV8E-zCNG;3)LERt2VkTP8&w}EyYI&$J+01q&@({EJ*p3(Am!}(dsFM`w|OIr9cU)-a&#38M2{okIT%E63&{M8?RNlL968XyQdbxhf@&?3&3yU*u>DqC?p#%V6wY_u#{Hp~)-eWatj>Wx0ZNpkasVdrBVb5<`Up8wjvF~s{kqAH71r4&R}uR)Tc01d7*vz>URQ3qWQAz8t2ioKV;r_L#l22f@IF@2L;*JGm4HTK2Q;n?qOAZ_Cr;EM2}z|kuG`l9XO?3t0TPYA?`wMB56-|Gyy-S*7EEP}M?EH(EVyI>3)p;jd)7<)wtkXrqzQm&&URa<x;Vq-9%ACW5YjMPx<e0*FeDWO+f*x>?p)@Rc@LF{$dCNGh=&x_3<AivQ-}$yZnt@NZqk@rW}KZB;$%nnfnCfQcsZw{f+k0^n5S>yr9#B;HO;ad6F@A@pb;o3Q9w6eKrB;45GKM)TospWukqa;ZrFxM)8WF2J>BiKEVfK@TjO1+(j%pkcG+D*#;S^Oz}~H<Ft?r9U7Es;yVAp;QMD9khXGFu2zBwFX^_Pw$QAZZ>Z$p0qpkeZgh^yd5|<8KrRvZ*JBhQ4=~)zpV61ZlCfU90(Rtf;bWgp&dvlkgr7PA3to^iiF~DDQz)HS$3F^34hN9|~=JBK_d1F@zFUa8R1JC2G2Jfd&=j@*e>}NlY@>#}<a6ij0J%Y61vBR@S#G(GHUVT~c@(donDn;=;u1oo;{E*2XL|=Ew*K^8xJbUTS>#GFtS}Ww9y9OqM9D703>lCedPVJc2UkC?~mM@+SCzE=3;^rA8X(DCvhdy?bGUi>X*N?u%)nt5s&wO<<KWb@QSJsS8L~n9f$*fTMrZ41Yr@dQo(aIkMh9uBh)2G#37cR7#T1(`(G@`$`OIa-n?T&S&q76w_RsoP#r91ZVy8W6gW1<&-PamDGy5&^JmQ5wqApQbyrZn7r`Pl(HLO4`eDLWVqLdpV=AO-1}{OrtzvKcqb-pM!hZm~kXqt((_mK8X8Jxv{tB_OA7Or3y}*=w)cc>@JJ6R%s`GSOKdhh@jP44SBzRlPu&d;4d(gr}HvoX8bC13Ktk*tvcBvOCEY5}8td7iKecj!+>VQC+N@CR~a%)~JqgL20)~+V6e@k!bT;7rT<shF8WbWaqA01ClJdcx4qitd3><yG&KO>!qva^1NoKn%J!}8M%`WW^$5lDtNk{3YVXECmQ38z>Sd^8V1#i%<_k-xWoYwnoiO&%(H_sy~auyV`HIEL~w-MkC+A`JCW6N5Df@F0TcimVRB%Pfe)(}l;!@5>;D}JfKVXXg1El^6Rw|`Zg4|V9AC;#^b{l!6sja*3`$T57GpDUT7@@g>QM(;ArwXtv`TV4yVeOcvCW54&yE}2TKMvlr?jhG^`oCPSzY;e-b-6jyT$mN$5{TMtDi8M1w6J@u9>e*!IYolzRwK$)lQRtQNT!EVigJj)*6Pi`WS(?2z<4K({YTraSoIN3>tR|;cvK$gW@-q@Dx~wvVexF^Cm^zSa=dtSwFoXuiOp|zf_Cnn6H+iM(JvMY4oF}k5$*AAqFuyY@Nc)<c2X?bHGh*X%LZscQ!sa>FulIHJ!Oy`{W8jf#dnoWcU3Kmh8S~CA%Lq$?p4u$?jE$eT!VRoRQqHW7Za0nd^26c<IXjMkiXtS?S!an=LMyPMx&vO%kQcGQyZC{SwpBx=u@NYb35|wog()G3}7@?Hp7qU{mp0e{Ssok#G9YU0rB}-m6F5efg|y9XDAKcYj8Mf>9ZJgt+f5KCQ2RNZLX9>UjRW+C++4j>+w$dcQnw<mR#5?#TA^p1!;Q^;4?7poQ8DN;^Oyiix?|1X@_TKwB#YJvpoUtT%6PZ*ksWJI3u(i^T<+JU3+{t>l1ov|3chy>W;!z_c#S&_-#_vUH#7fOf9X9D`}I!;P`<WkSiPhE(j|3OXh|N!ctX-jkhu^|1^}aM+pLf==2=zO>tZSyrIH%iWE`rcFCDC1>5rXb>iEgWP|paXVkgL)tN~wkF;V&uH=cQH;UZ_$lqdX(4&C6r)$`^WAmLz2k&OAY`~}H=7J#_3FWVcdxqsfj!XE8F~@KRKB@!xAW?)u<oiQ_&%$v3i<<_#8L2e=ZajeIUZraXR!!(u2h`YXX^4IN^C<%CTBx0Z+$A4w^VyvSV9L2j5}C$T3o`fh1Ls7DPVeC4r!sb*<b_d<$c@>Yz|n!0}14oXkV#vwL|zkJH7sX3ff<7i;U2(Z>@332pkim&KgOda(Q5tyXmwZnzI>|U8p}({KIiY79ulIfTt4)m`F~jYY{W=+RE;Nf!>7#rVxCUkJ#^Pa0=0DlUwrnDa5v$*3SI$`p;NDoMfe}cS{9sH^y!1es}exM>uhP>+RsWu^|EZ9ieD;UA1H<O7ptH(&g}33c-Nlbct;rxdA2gb1bAZ0%{~u1+J6%fT%Yq`&LG^UjsG#ztE4930#0_q(nv?%B#1A?kR7+M`v8A)Qc+YBcJ~f+otrUyCS>^zuJjW=jnU^(1_5k9+7xaARy&y)LA^}$k_YQeBVC&K^bm!UJ3Zw`oN%@v4V_--kTYevqVEr(Cc@6BsrOa2X7%Fn_l1|LG_nl9vx_!7;qT_>Ga$OV4((-*)G?^M@B)fz)Ec^Gnx0TMg6jz<5fN5=jv<(@=Ga7ZLj#N9JPNE;bOvgoDjV~N_?}QYNA)(5dU|PhQkFDZBcs)jEWw)^n&q3ChL$3EEynW4uo^9RvmXeVjvQ(nOy1*WS~06Xr=kk!dlW-Q6OsyX#Fhlo4siBl?$;XCG&1Y!;n3WQV5stN^t8)-dUeYD{yB{C8!=nk4vsccM7fse2oK)3Tr$`;R<)0euk;+#CMJbnD|xpBnu$O!Ka6m_Zg2MV*lL>5OGyP)s~jFR|_NKQ_?>W%QvA0+SpI5u^;#8!3&u}Xv|`dW2e+^;x}PPcQCB$HoNIKsnvS7OnS_wyvLSDF`i7I_W9lmBbtL1gPAXv1u=szwX6AiuvtYF)h4~5-5&bj7{I(k#usu4(46hHkd)G<oNzo+j1CsEDx3x=Wm_7V16SKt=<Ks186WHMWdmb)bUc~dp2QY2d9-8!z~=MaZMlr=ga`x9NKc7FtH=T0sN-HUV`;4t;#RGiY?amH*o%rsaoJPt0y?2iAk?{ZC5(>bndVtUdTOYQOC2tyOPV2oQ@~c!vqNf@^xi6Jb!k;ADc23F+NDDXQd5qal!|Lu3KqIVN}qOpq7TDvMs>UpxEzBr-tX>qsx0U?$p!z0ycerZ;wITW41DF0dgZFwy{-+^dQ2V&r#H6BbF?T92+cuSg;F?_M8#twl><YyBkadN{MW8$_2VD@TRXMa^<(a><i}i@Gu>p_TwlqYUVfHKcpnA6b*c`k3uEO2-<)1D@lSCD6Lidk?b1^}%`V2IUIL#E(%Xg)`eYTiL%o8b9i+ftF2RjEv`AtlPgrihQzCi>e#l#Jkz8VSqMp9u^Nx1~gEq3KN{Q9+Ojt@x_L#zm#^lP>`jy1aeC?{i&Yafdwr2&Jg;m|KD@m|N?D&9)f)3dySN*hF<c%HUC=b-pAi$LJ5IMOoP&2})@!6c}cf)1eltAA^H@c=>Pf?rrRkUR1j0KM&Gf6E-kBkyrR!BH^>(1(hg@misWH+U5nEsOUT3f%%@^+XrT(`Zr!tH=k4ma4HsEVpS&x(XL<gQTO_EfIGid)sX?MForiw%$cJ8}5}v0<v+Rx4w3Pvr63<BGh#lfB-jILtw3yDZE-o##~%4;P53MQb6SYXpwnf+U&vpp|R<=u`$ZeKh4Dy5@&wE6cIyqg#vBcTQ8MhG|JjQZq=ikxCBKd|guUglN=_4%C<4CJSnR3}SkbVNS?WkMzL-G<|(?fHE`lMa4wUwCuW)zJsx_Blq-!m1=?1sB*jLg31wcv=w9}o|#<6^$*RVP3m}LP{i;*x(-;mP?y}=Ah^=5yoDzxG^>f`$OJmUQl4;%t#su~=<McW%vXgi1ASX~)x|D1DjqU8A1EAZ4owi7jYcz7B*G^WrqyRs%*R6oLoL2p!WUGW;+EayrtGGVX(o#}L7p*SkxGkhn+KFZF6n&XQ*bT~1FTr&LWdp{&9cZ)eNqqAhU<G|%6n{=XlZ$0UZdqAk*aQ0rB>fDYzAdoxsE&a9eDmxAs}i9fFZE^rbg+OrCvRlR9XJi)PD>i(jcM-jW?=*!AhQ<vKNR>?)TNbe2`t4PVLU%K2jC#(Mli$dot$x)Q$PNp7adnV(;ZVo33xL3;d@yWLICE^+jiQr@MdC$!Xu0iI$endYhUYmG=b7%M)a&ZYHqzaV{;%*%(Tdyr8pxYf~)(a;}8*5&JAUr409sNAEJdnv18XgEfHZGxw};Jl{sII<+In6VQ<0QXkf{B&v3<jP{(j$N7*A?WJ41Q0CSzu(K+OK`SGhkN`I)hL~luX0^1pPNL0jxH|}MOz5r~YwuDAe!q1m#b;#}*R+TCgq9exe7e52!KNsoB>=_A;txv#L$z=hg*}t%NkZrGbba04^=GfQ6-{}DTJdWKRh`81mE{z*iZ!;n-j8$oQU^F`$uppoKnm^sZvQh7z<c+n2cJK9IQ`A1zrBl@ThKxK9C!(>KTYclT-^YqvD8m9Fctys^U6+6;I}dtaZHZ?&K0S>IjFjC>ZlN5?^Yk@mrmr^xS#XY)*4%t7;2+&1BRCR%<(_E9^*^n3h9INdW$jEP=M_9F6oJ{SSayRlt(Pue?7e4a@!8f+@cljd^Cpx^%O|ttL#ee-CHUVw!)V5<$bO%PCIXE>MY37SXE%e2Hirh-l4P$honDXR}Sg$XKCqB!?&G$iiSbSB=uSI>z*nD)DZ((hoZU3<2_fZS59uw3_d`H!yQa-zT<XR{9rC*IyLrivvuzh)v9s(LJLpbl3=Q`=#cs;+k1KN^!lH!|HHFQy3+)&Ljit0%aSZM*VUL?Pps4B)ul<zjY$+zNtkq8K3<oS$|cQnxqm>Vw?e8P0Z*51v?;bIRovWFw1zhh*+<#Yr5Jc+hkehI1dWnR%jWhmc;-GF7_hZN#%G_23iLT$G=e6Kpke_c7Ld>tNBZb}5?LTjMu}~P<4uITI{==5@UiF=#0W-43mJGGf2{5j3VhQe<6%e_%Ooj=LTOgX9!ln1Y}2`jq^_fIYZ+*IsDLj92d2^_gTSnv`2c=A*+Q%WmOqh~@gzLY!FYcHzX^~7nBn=6wDZW|@bXLmPLXqURi-aHKT4q+@OYsk)q*yAV3sOM(WnqhAC<wGNVsZKvH)MYIKwL9z^5syH+DvHsw3dJ&^*IFb}Uj#X_9Za!(ii4vxGGAM(QFW_@wS3QlH?DzJ&-rHkS~=7kvj2d~97nqys$JaUE8&SJ1pjG8&aKewPf)GQT_`euepu>FevCa%^ur2NyI{x>|;<Z>gOYnxs)l%t)t!VZukH6x5|-l4yX(Jj5(thxL%37IWMV`<us#x{F`LfxsX}o*LPNMk)Zk(TN_k5}C2$yLHK1ol)JOyNNaFf=8fy#JfPqqJqAlI8rx7seBTlFjTuu@IY2eD&-X=KHf2xtNk{#_Jx;ANd?*-H;!3=OLE4S44%ttkO~%>+p3JB+k5)*;1I7hscc2)k6d)(hnBd1U^Sz;3c$)UdGTN=^y3`uXTTpVga}Oij^QEx?LmzfHj|o7buXvYQoa(NGK=o{>(be^PFf>n+(-)@>j2aeWoKBpKNE)=0-xgbal8z8C_I@2)>1zVPHJWh?-u}S{5{ml4V-|MiO0=jQiST9NzZIpmPf>y$^(65c>~9+8DMlnFFS=#tcnuku_Uj)?KYwnQaMcW121v;vpM4om-HJ%fO?uN=8|6eSm&PGywUsa*s3M41~E~p!k}SC9szq(u2GBa#4wt$_QW+>fH#iF!%dEAvb^3;!D2GXKBCLMT;8Zt^yxkv`!x1wRc5xEt<FSdfw#ATM50<@M)yOU(zz?{jLZwVGG?7@_r~3clFPofdMI}_6nbrUhpAR}{eU&J8!)tF9s4Z%er8s?%54d1&<NT-kh-o%gZC>pk<vSO4t`8Gx|Qlix2+{W6t6F853V#GsN`O2$?+CYFnsF1DxV!*{~7b^>IN`6?=V6WD&&1w*WaIusB9d5X=0n}wVM0jN^_f7h*zg^w)gz;7D$1)bkDq+Fse`?h?d#K``Glou>enASV(C`u->xZg-bi557%z4!1WECK?qb%-nw)~Vb9zKlM#a*;bd@`MyAIBDPX;k@nW7rFmVdt<NOpNJF=vu;6-qDlyj^n#$_}Z<|iw7=fHB+=~0&Nj2=HdJb3YPWcfPq49Eo{S{<Qm5^s{E!<X|Y5Jwmfqi30w)hS*^VmnIIya^w)FGX*3y{Nq!<0$Z$R7BR?Z_7tpwu47&9^%4Z>|1Q^xRDFFs|^qV`rAwqp@CY8^o_0HGm^)c#UcEz`@~cHmv-9=V{sE3Vg0@(T{Ed&OT7QK&^wnKMjv(O$QVZZl9xc9l9>#9l_yA-!*cDFdbEtHqW{hXdj1FD28a>_56+sHB9$Qz`xzn~7H3)Bq;znZ5d`h)GD~M;pz4G@(!-jNzIUHacda<crLTDp2;IErPJBhmstQLSkqjT?R>#)OxudNHYD*~aD^9bI6K+8|M8k6K-QKn2OpgSclB}SzJQ@-$^K_vE^zGHx70X)5he|K^2!ZucEi%HubYz3UObF96inR$Idv$SNY|&V74Wz&6Od$W`3acn8R3<7|?g2^Z5O{;6g|48{arSBk!*)zpF*o+5d1L3o9P-y}1B6bXu|8yZr2W@sT^eXSzIlN~YBEAxYvBvD35mZfNnlwMvLaF?D57Jr#MtDT8rRg0{`<Y0z?M{<W3te&lc0T2IUJ*<cC675$7k4YQ>Crg&m^}xQE8(3Lg+gV-oHwTH_>l=i&wbD$R?}Nk0@q$2yh_0Pb<SkHw1-FS&i66lTe9pOZi&Q8#D3z;Kdh@4-X%Ic|Zrg2y~(Jeu6Fb;^6S*i^uyf@$o6gp}=EIlBRTPA17$W=xD=)DxfT*bA7Sv48#V^)%72>!w3>W<}1z4GrG7s&z5CZZ|KdclTvTmOr9~gu$4@s_uf@29Z=+6jyDGvRO5$QnwCFcG$(QWE^A#84baq%=Y(F9x98IJ(+y&kL;y<JujvuM1)YVZ@xIc7@NyJf_Nc+6JUznwnTs``YQ9P%QgBLG+Z-kXEj++%ypTVUJFUdzWNXz~9LX%_ZRVny@={?hzy<hU)C9GKx#8r7o6$_v<Gz_(M4;bwLST^sw-n}0rgBSaIgMAO*I#6o!;Zkh`3*Otsi?>A#d_!<DyQ3IbUL`W6_gtw=9c7l8m~zHzXF`eMBgoO<}_XrXDYL}2xm8t7HP^H=S&(zESunT;!_I7uWC+Pm)3SmU9^Xp#9ZLYNi2$`Rt*e%+dwIsKZvH`CLcoKJ4xpoX?{Jf4&_&!&@!t3VrJPfRIAKzsL_qI{_1nOmH0N}ycH2wvv<GHd3TK2Dl;Bx^dWTl@_GH`&~z*ISj`^()nibZtDE6&sL`qh@MoLXtvF*ftN(LPdD*1N?zc^`at4NGyP(Zq)~+=J>rimzDJ>)5FK3<|W4zKF2U`7-ESWvf+Yxd#BmPUBdB-5HH0Oa<f1NhSp7QNjWHm$n*N?-FQC<mq1Fe1`mfRlW?YLt#WBxNwT1NG>D@*Nk;<4bWDmxVH;e9rXs?w9E>?dkDRL1dCHB{EL_=!W5BMep9IIW`cBH`bPlv`(9ibS1Nj<pX|JWjRdn{@c);ot8~Hy%8^QB4LNAg}9Mu!5_*PUgXHZoL%#(y2Jo#X{@&^eiiQ&!dN*+KX<uj-YmZDzLqkPSB)N7;>KB7O|Ty&{-uTO|M(<RrYIl+Nva3eQ9xmOUIH~1}Z}OR(=C@9<^H%f*o6^H;dbydNic8MG}0mUFRiVk#y-k{|&sbpcMEyFRuSN5mk|u)@HtD^Kv<AFG?E}Z|=yQapSU{$%_HTiYLdNdcaLO4&56~VQQm^x9+V!oJ<rrMIrzv&!71<OZZ!KEGk?>ipOVJU6eb!YKpRzaw4cCf2ESLrgYG24qR%AF+9Vcp2js93EG=ix_sc_=BiMP%QFr#ImZ6b0|Iu@sPRUxUVi>5788!n#5<U;MQg7~A9{N3UPECyy#~V#ZVm8t@BZYw?*NtGeb@8!!NRA%UHEkU9z5Q13lm`sdYEoa0@Y-hqJ*1Oi{T!7qndJCW;<F$?KM-%simxzYL)k1@YnaRdiDZ6elcCQSIavUg#r6Ii_*Tu^emMt>CV!<y=%l`+nqtKlR{X4K7NOZQ7M5z1_rAP8tjtXjb8uzz3JzCdUALA+czkR-sqIr)a6%u2Z&t>s_Wt86N7<WDYv@XAS<`q$422Jd2r}^jdN%Hp{g^u3A?Go2$u32Rr>w}_DG#|-On9=Q)Cx-1`gUPRj5G&*|e4!w$6`I+^-V%RYEq+7FR1?|3`+a^JOXh5`74Qst0wglj+Z>`1hfjHh78wH1Nsx?)t-l!Rqbh#tgaRQ?hx-Y{^nMUMz+;7A!r|pIAJah(}`zt@sJ;h95xB;v+^xd79x4#E#3c;x;3v%Ew^W)=@N>CB;uWhBFuLMUv+s;LgPBABKuVZ!n92a;e@Lso|+PMN^H0$w$^noD1fq3cHCv=-8K9-@?TXF$_Zb(LPkHxS``71-+yrhwjW5xjgokkp9gmjoYL6SGhL5Nbt;@z2<ov0NoCip1?q=!5uJ2N)^r1mO2e$2QU@ap$HqOG)Z?qUPp!z28zuN{`2c~MOBBCw5`;*DZR6E{T8fil7XAzJ|YvBH|n8JtWGy&#yc)?R!A#-e#}j*k-Vs{MY6>ujN}Kk_E&j&!_|Oi)Y$;#4R3Sm3&U>XG~F_++TL9pRH@=Jd3Lm`(-f6qrp0BmY1ckqwanwFIzq)Xu6>d42(<a%jlA`VXZv%OP{U^jQR-Zv6;up)dCjgMR-=T}(!XnlWU5Cy>d0jRv&ptK9@-OQbMP%#PX$OTa9xuqSjF@9oZUuVXYZ0Xw6Ex|jRP^_bl9s2FQp6MH7<bXI1!83&BPNo;vRQ5mD(=-;O=dMH&yd*bAJybK}6eDSe;Z;e$?Hi>1@ulxRFi{{Xo9?&(9<`%=YvbZ1;EjthvZidxI@!e#oTS%FDIQcDAC~L28l9)?vduh~APl6?<N*I=au%p$wuNE3oBmx8`6QdzQCQhU(l|D=O^aVfC;_J^tHf$Q9fyODFBf0LD054qhk{7~%m}$*i_Hz|C6|AxK?l8>0TUcMPn!^T16#Q3l{vfZ9og+e7Mg2>bR#+z^~H^0$Z7r|F3t4Na8Vz8(Cw1RB`4-VCxb>-6jpS$)Sz9}B$?z<ySGABYQB>VtrFSnIu}eghVJpMDmwS`S#TO3}$B%TJ3EJl#<t;*5t(p523C`N#AB4{6HI+y"""


def substituir(orig: str, antigo: str, novo: str, arquivo: str) -> str:
    qt = orig.count(antigo)
    if qt != 1:
        raise RuntimeError(f"{arquivo}: esperado exatamente 1 trecho para atualização, encontrados {qt}. O repositório mudou: nenhuma alteração será aplicada.")
    return orig.replace(antigo, novo, 1)


def atualizar_app(s: str, p: str) -> str:
    s = substituir(s, "import Layout from './components/Layout'", "import Layout from './components/Layout'\nimport ProjetoGate from './components/ProjetoGate'\nimport EntrarProjeto from './pages/EntrarProjeto'\nimport CompartilharProjeto from './pages/CompartilharProjeto'", p)
    s = substituir(s, '<Route path="/pregar/:id" element={<Pregar />} />', '<Route path="/pregar/:id" element={<ProjetoGate><Pregar /></ProjetoGate>} />', p)
    s = substituir(s, '<Route path="/mensagem/:id" element={<EditorMensagem />} />', '<Route path="/mensagem/:id" element={<ProjetoGate><EditorMensagem /></ProjetoGate>} />', p)
    s = substituir(s, '<Route path="/mensagem/:id/slides" element={<EditorSlides />} />', '<Route path="/mensagem/:id/slides" element={<ProjetoGate><EditorSlides /></ProjetoGate>} />', p)
    s = substituir(s, '<Route path="/mensagem/:id/respostas" element={<RespostasEstudo />} />', '<Route path="/mensagem/:id/respostas" element={<ProjetoGate><RespostasEstudo /></ProjetoGate>} />', p)
    s = substituir(s, '<Route path="/biblia" element={<Biblia />} />', '<Route path="/entrar-projeto" element={<EntrarProjeto />} />\n            <Route path="/convite/:codigo" element={<EntrarProjeto />} />\n            <Route path="/mensagem/:id/compartilhar" element={<CompartilharProjeto />} />\n            <Route path="/biblia" element={<Biblia />} />', p)
    return s


def atualizar_layout(s: str, p: str) -> str:
    s = substituir(s, 'NotebookPen, Plus, Settings', 'NotebookPen, Plus, Settings, Users', p)
    s = substituir(s, "const FIM: Item[] = [\n", "const FIM: Item[] = [\n  { para: '/entrar-projeto', rotulo: 'Convites', Icone: Users, fim: false },\n", p)
    s = substituir(s, 'z-20 grid grid-cols-4 gap-1', 'z-20 grid grid-cols-5 gap-1', p)
    return s


def atualizar_tipos(s: str, p: str) -> str:
    return substituir(s, '  id: string\n  titulo: string\n  texto_base:', '  id: string\n  proprietario_compartilhamento?: string // identidade imutável do dono\n  titulo: string\n  texto_base:', p)


def atualizar_mensagens(s: str, p: str) -> str:
    s = substituir(s, 'Search, Target, Trash2, X,', 'Search, Target, Trash2, Users, X,', p)
    s = substituir(s, 'function LinhaMensagem({ m, blocos, pasta, pastas, hoje, menuAberto,', 'function LinhaMensagem({ m, compartilhada, blocos, pasta, pastas, hoje, menuAberto,', p)
    s = substituir(s, '  m: Mensagem\n  blocos?: Record<string, number>', '  m: Mensagem\n  compartilhada: boolean\n  blocos?: Record<string, number>', p)
    s = substituir(s, 'useDraggable({ id: m.id })', 'useDraggable({ id: m.id, disabled: compartilhada })', p)
    s = substituir(s, 'aria-label="Arrastar para uma pasta"\n', 'aria-label="Arrastar para uma pasta" disabled={compartilhada}\n', p)
    s = substituir(s, "<p className=\"truncate font-display text-[17px] font-bold leading-snug\">{m.titulo || 'Sem título'}</p>", "<p className=\"truncate font-display text-[17px] font-bold leading-snug\">{m.titulo || 'Sem título'}</p>\n        {compartilhada && <span className=\"mt-1 inline-block rounded-full bg-ouro-suave px-2 py-0.5 text-[11px] font-bold text-tinta\">Compartilhado comigo</span>}", p)
    s = substituir(s, '''            <button onClick={onDuplicar} className={item}>
              <Copy size={18} className="text-texto-2" /> Duplicar
            </button>''', '''            {!compartilhada && <button onClick={onDuplicar} className={item}>
              <Copy size={18} className="text-texto-2" /> Duplicar
            </button>}''', p)
    s = substituir(s, '''            <label className={`${item} cursor-pointer`}>
              <FolderInput size={18} className="text-texto-2" />
              Mover para
              <select value={m.pasta_id ?? 'sem'} onChange={(e) => onMover(e.target.value)}
                className="ml-auto max-w-24 truncate bg-transparent text-sm text-texto-2 outline-none">
                <option value="sem">Sem pasta</option>
                {pastas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>''', '''            {!compartilhada && <label className={`${item} cursor-pointer`}>
              <FolderInput size={18} className="text-texto-2" />
              Mover para
              <select value={m.pasta_id ?? 'sem'} onChange={(e) => onMover(e.target.value)}
                className="ml-auto max-w-24 truncate bg-transparent text-sm text-texto-2 outline-none">
                <option value="sem">Sem pasta</option>
                {pastas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>}''', p)
    s = substituir(s, '''            <button onClick={onExcluir} className={`${item} text-perigo`}>
              <Trash2 size={18} /> Excluir
            </button>''', '''            {!compartilhada && <Link to={`/mensagem/${m.id}/compartilhar`} onClick={onFecharMenu} className={item}>
              <Users size={18} className="text-tinta" /> Compartilhar projeto
            </Link>}
            {!compartilhada && <button onClick={onExcluir} className={`${item} text-perigo`}>
              <Trash2 size={18} /> Excluir
            </button>}''', p)
    s = substituir(s, "    if (pasta_id === m.pasta_id) return", "    if (m.proprietario_compartilhamento && m.proprietario_compartilhamento !== sessao?.user.id) return\n    if (pasta_id === m.pasta_id) return", p)
    s = substituir(s, "      : filtroAtivo === 'sem' ? !m.pasta_id : m.pasta_id === filtroAtivo", "      : filtroAtivo === 'sem' ? (!m.pasta_id || (m.proprietario_compartilhamento != null && m.proprietario_compartilhamento !== sessao?.user.id)) : m.pasta_id === filtroAtivo", p)
    s = substituir(s, '              <LinhaMensagem key={m.id} m={m} blocos={contagem[m.id]}', '              <LinhaMensagem key={m.id} m={m} compartilhada={!!m.proprietario_compartilhamento && m.proprietario_compartilhamento !== sessao?.user.id} blocos={contagem[m.id]}', p)
    return s


def atualizar_editor_mensagem(s: str, p: str) -> str:
    s = substituir(s, "import { useAuth } from '../lib/auth'", "import { useAuth } from '../lib/auth'\nimport { usePapelAtual } from '../components/ProjetoGate'", p)
    s = substituir(s, '  const { id } = useParams()\n  const { status, agendar, cancelar }', '  const { id } = useParams()\n  const papelAtual = usePapelAtual()\n  const { status, agendar, cancelar }', p)
    needle = "        <span className={`ml-auto mr-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status === 'erro' ? 'bg-perigo/10 text-perigo' : 'text-texto-2'}`}>",
    needle = needle[0]
    novo = '''        {papelAtual === 'dono' && <Link to={`/mensagem/${mensagem.id}/compartilhar`} className="botao-secundario px-2 py-1.5 text-xs sm:text-sm">
          <Share2 size={15} /> Convidar
        </Link>}
''' + needle
    return substituir(s, needle, novo, p)


def atualizar_editor_slides(s: str, p: str) -> str:
    s = substituir(s, "import { useAuth } from '../lib/auth'", "import { useAuth } from '../lib/auth'\nimport { usePapelAtual } from '../components/ProjetoGate'", p)
    s = substituir(s, '  const { id } = useParams()\n  const { sessao } = useAuth()', '  const { id } = useParams()\n  const papelAtual = usePapelAtual()\n  const { sessao } = useAuth()', p)
    needle = "        <span className={`ml-auto mr-2 flex items-center gap-1.5 text-sm ${status === 'erro' ? 'text-perigo' : 'text-texto-2'}`}>",
    needle = needle[0]
    novo = '''        {papelAtual === 'dono' && <Link to={`/mensagem/${mensagem.id}/compartilhar`} className="botao-secundario px-2 py-1.5 text-xs sm:text-sm">
          Convidar
        </Link>}
''' + needle
    return substituir(s, needle, novo, p)


ALTERADORES = {
    'src/App.tsx': atualizar_app,
    'src/components/Layout.tsx': atualizar_layout,
    'src/lib/tipos.ts': atualizar_tipos,
    'src/pages/Mensagens.tsx': atualizar_mensagens,
    'src/pages/EditorMensagem.tsx': atualizar_editor_mensagem,
    'src/pages/EditorSlides.tsx': atualizar_editor_slides,
}


def main() -> int:
    parser = argparse.ArgumentParser(description='Instala colaboração por projeto no Púlpito')
    parser.add_argument('--dry-run', action='store_true', help='validar alterações sem escrever')
    args = parser.parse_args()
    pasta = Path.cwd()
    if not (pasta / 'src/App.tsx').is_file() or not (pasta / 'package.json').is_file():
        print('ERRO: execute o script na raiz do repositório Púlpito (onde fica package.json).', file=sys.stderr)
        return 2
    if (pasta / 'src/lib/compartilhamento.ts').exists():
        print('A colaboração já parece estar instalada. Nenhum arquivo alterado.')
        return 0
    arquivos = json.loads(zlib.decompress(base64.b85decode(''.join(PAYLOAD.split()))).decode('utf-8'))
    alterações: dict[str, str] = {}
    try:
        for caminho, alterar in ALTERADORES.items():
            arquivo = pasta / caminho
            if not arquivo.is_file():
                raise RuntimeError(f'Arquivo ausente: {caminho}')
            alterações[caminho] = alterar(arquivo.read_text(encoding='utf-8'), caminho)
        for caminho in arquivos:
            if (pasta / caminho).exists():
                raise RuntimeError(f'Já existe {caminho}; para sua segurança, não sobrescrevi.')
    except Exception as exc:
        print(f'ERRO NO PRÉ-TESTE: {exc}', file=sys.stderr)
        return 1
    print(f'Validados {len(alterações)} arquivos existentes + {len(arquivos)} novos arquivos.')
    if args.dry_run:
        print('Dry run concluído: nada foi modificado.')
        return 0

    backup = pasta / '.pulpito-backup' / datetime.now().strftime('%Y%m%d-%H%M%S')
    try:
        for caminho in alterações:
            destino = backup / caminho
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(pasta / caminho, destino)
        for caminho, conteudo in {**alterações, **arquivos}.items():
            destino = pasta / caminho
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(conteudo, encoding='utf-8')
    except Exception as exc:
        print(f'ERRO DURANTE A GRAVAÇÃO: {exc}; backup: {backup}', file=sys.stderr)
        return 1

    print('\nInstalação dos arquivos concluída!')
    print(f'Backups dos arquivos alterados: {backup}')
    print('\nPRÓXIMOS PASSOS OBRIGATÓRIOS:')
    print('1. Execute no Supabase SQL Editor: supabase/migrations/20261020224000_compartilhamento.sql')
    print('2. Confira o mapeamento do proprietário no SQL e revise a RLS existente.')
    print('3. Rode npm run build e teste com duas contas.')
    print('4. Confira git diff, faça commit e publique.')
    if (pasta / '.git').is_dir():
        excluir = pasta / '.git' / 'info' / 'exclude'
        try:
            excluir.parent.mkdir(parents=True, exist_ok=True)
            anterior = excluir.read_text(encoding='utf-8') if excluir.exists() else ''
            if '/.pulpito-backup/' not in anterior:
                with excluir.open('a', encoding='utf-8') as f:
                    f.write('\n/.pulpito-backup/\n')
        except OSError:
            print('Atenção: evite incluir .pulpito-backup no commit.')
    if shutil.which('git') and (pasta / '.git').exists():
        subprocess.run(['git', 'status', '--short'], cwd=pasta, check=False)
    return 0


if __name__ == '__main__':
    sys.exit(main())
